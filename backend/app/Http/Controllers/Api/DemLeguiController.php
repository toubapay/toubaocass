<?php

namespace App\Http\Controllers\Api;

use App\Events\DemLeguiRequestMatched;
use App\Events\DemLeguiRequestPosted;
use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\AcceptDemLeguiRequestRequest;
use App\Http\Requests\Rider\QuoteDemLeguiRequest;
use App\Http\Requests\Rider\StoreDemLeguiRequestRequest;
use App\Http\Requests\UpdateDemLeguiTripLocationRequest;
use App\Http\Resources\DemLeguiRequestResource;
use App\Http\Resources\DemLeguiTripResource;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\SecurityAlert;
use App\Models\WalletTransaction;
use App\Services\CommissionService;
use App\Services\DemLeguiPricingService;
use App\Services\SecurityAlertService;
use App\Services\TrackingLinkService;
use App\Services\WalletService;
use App\Support\Geo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DemLeguiController extends Controller
{
    /**
     * Live fare preview while the rider is placing the destination/seats.
     */
    public function quote(QuoteDemLeguiRequest $request, DemLeguiPricingService $pricing)
    {
        $destination = City::findOrFail($request->validated('destination_city_id'));
        $seats = (int) ($request->validated('seats_requested') ?? 1);

        return response()->json($pricing->quote(
            (float) $request->validated('pickup_latitude'),
            (float) $request->validated('pickup_longitude'),
            $destination,
            $seats,
        ));
    }

    public function store(StoreDemLeguiRequestRequest $request, DemLeguiPricingService $pricing)
    {
        if ($request->user()->demLeguiRequests()->active()->exists()) {
            throw ValidationException::withMessages([
                'dem_legui_request' => ["Vous avez déjà une demande Dem Légui en cours. Terminez-la ou annulez-la avant d'en soumettre une nouvelle."],
            ]);
        }

        $data = $request->validated();
        $seats = (int) ($data['seats_requested'] ?? 1);
        $destination = City::findOrFail($data['destination_city_id']);

        $quote = $pricing->quote(
            (float) $data['pickup_latitude'],
            (float) $data['pickup_longitude'],
            $destination,
            $seats,
        );

        $demLeguiRequest = $request->user()->demLeguiRequests()->create([
            ...$data,
            'seats_requested' => $seats,
            'payment_method' => $data['payment_method'] ?? DemLeguiRequest::PAYMENT_METHOD_CASH,
            'fare_total' => $quote['fare_total'],
            'status' => DemLeguiRequest::STATUS_PENDING,
        ]);

        DemLeguiRequestPosted::dispatch($demLeguiRequest);

        return new DemLeguiRequestResource($demLeguiRequest->load(['rider', 'destinationCity']));
    }

    public function show(Request $request, DemLeguiRequest $demLeguiRequest)
    {
        abort_unless($demLeguiRequest->rider_id === $request->user()->id, 404);

        return new DemLeguiRequestResource($demLeguiRequest->load(['rider', 'destinationCity', 'trip.driver.driverProfile']));
    }

    /**
     * Rider-facing: the rider's currently active request (still searching,
     * or matched to a trip that hasn't finished yet), if any — powers a
     * persistent status widget shown elsewhere in the app (e.g. the Home
     * screen) without the caller needing to already know a request id.
     */
    public function myActiveRequest(Request $request)
    {
        $activeRequest = $request->user()->demLeguiRequests()
            ->active()
            ->latest()
            ->with(['rider', 'destinationCity', 'trip.driver.driverProfile'])
            ->first();

        return response()->json([
            'data' => $activeRequest ? new DemLeguiRequestResource($activeRequest) : null,
        ]);
    }

    /**
     * Rider-facing: full history (past + active) of the rider's own Dem
     * Légui requests — powers a "my bookings" list, unlike
     * myActiveRequest() above which only ever returns at most one row.
     */
    public function myRequests(Request $request)
    {
        $requests = $request->user()->demLeguiRequests()
            ->with(['rider', 'destinationCity', 'trip.driver.driverProfile'])
            ->latest()
            ->paginate(20);

        return DemLeguiRequestResource::collection($requests);
    }

    /**
     * Rider-facing: anonymized positions of online drivers near the pickup
     * point, used to render a "searching for a driver…" map while the
     * request is still pending — no name/phone exposed since none of these
     * drivers have accepted anything yet.
     */
    public function nearbyDrivers(Request $request, DemLeguiRequest $demLeguiRequest)
    {
        abort_unless($demLeguiRequest->rider_id === $request->user()->id, 404);

        $drivers = DriverProfile::query()
            ->where('is_online', true)
            ->whereNotNull('current_latitude')
            ->whereRaw(Geo::distanceExpression('current_latitude', 'current_longitude').' <= ?', [
                $demLeguiRequest->pickup_latitude, $demLeguiRequest->pickup_longitude, $demLeguiRequest->pickup_latitude,
                DemLeguiRequest::NEARBY_RADIUS_KM,
            ])
            ->get(['current_latitude', 'current_longitude']);

        return response()->json([
            'drivers' => $drivers->map(fn (DriverProfile $driver) => [
                'latitude' => $driver->current_latitude,
                'longitude' => $driver->current_longitude,
            ]),
        ]);
    }

    public function cancel(Request $request, DemLeguiRequest $demLeguiRequest, WalletService $walletService)
    {
        abort_unless($demLeguiRequest->rider_id === $request->user()->id, 404);

        DB::transaction(function () use ($demLeguiRequest, $walletService) {
            /** @var DemLeguiRequest $locked */
            $locked = DemLeguiRequest::where('id', $demLeguiRequest->id)->lockForUpdate()->firstOrFail();

            $trip = $locked->dem_legui_trip_id
                ? DemLeguiTrip::where('id', $locked->dem_legui_trip_id)->lockForUpdate()->first()
                : null;

            if (! in_array($locked->status, [DemLeguiRequest::STATUS_PENDING, DemLeguiRequest::STATUS_MATCHED], true)
                || ($trip && $trip->status !== DemLeguiTrip::STATUS_OPEN)) {
                throw ValidationException::withMessages([
                    'dem_legui_request' => ['Cette demande ne peut plus être annulée.'],
                ]);
            }

            if ($locked->payment_method === DemLeguiRequest::PAYMENT_METHOD_WALLET && $locked->status === DemLeguiRequest::STATUS_MATCHED) {
                $walletService->credit($locked->rider, $locked->fare_total, null, WalletTransaction::TYPE_REFUND, "Remboursement Dem Légui #{$locked->id}");
                $walletService->debit($trip->driver, $locked->fare_total, null, WalletTransaction::TYPE_REFUND_REVERSAL, "Reprise de revenu (Dem Légui #{$locked->id} annulée)");
            }

            if ($trip) {
                $trip->increment('available_seats', $locked->seats_requested);
            }

            $locked->update(['status' => DemLeguiRequest::STATUS_CANCELLED]);
        });

        return response()->json(['message' => 'Demande annulée.']);
    }

    /**
     * Driver-facing: pending requests near the driver's last reported
     * position — only visible while the driver is online.
     */
    public function availableIndex(Request $request)
    {
        $profile = $request->user()->driverProfile;

        if (! $profile || ! $profile->is_online || $profile->current_latitude === null) {
            return response()->json(['message' => 'Vous devez être en ligne pour voir les demandes Dem Légui.'], 422);
        }

        $requests = DemLeguiRequest::query()
            ->where('status', DemLeguiRequest::STATUS_PENDING)
            ->whereRaw(Geo::distanceExpression('pickup_latitude', 'pickup_longitude').' <= ?', [
                $profile->current_latitude, $profile->current_longitude, $profile->current_latitude,
                DemLeguiRequest::NEARBY_RADIUS_KM,
            ])
            ->with(['rider', 'destinationCity'])
            ->latest()
            ->paginate(20);

        return DemLeguiRequestResource::collection($requests);
    }

    public function accept(AcceptDemLeguiRequestRequest $request, DemLeguiRequest $demLeguiRequest, WalletService $walletService)
    {
        $driver = $request->user();

        if ($driver->driverProfile?->kyc_status !== DriverProfile::STATUS_APPROVED || ! $driver->driverProfile?->is_online) {
            throw ValidationException::withMessages([
                'driver' => ['Vous devez être en ligne et vérifié (KYC) pour accepter une demande.'],
            ]);
        }

        $carId = $request->validated('car_id');

        $trip = DB::transaction(function () use ($demLeguiRequest, $driver, $carId, $walletService) {
            /** @var DemLeguiRequest $locked */
            $locked = DemLeguiRequest::where('id', $demLeguiRequest->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== DemLeguiRequest::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'dem_legui_request' => ["Cette demande n'est plus disponible."],
                ]);
            }

            $trip = DemLeguiTrip::where('driver_id', $driver->id)
                ->where('destination_city_id', $locked->destination_city_id)
                ->where('status', DemLeguiTrip::STATUS_OPEN)
                ->where('available_seats', '>=', $locked->seats_requested)
                ->lockForUpdate()
                ->first();

            if (! $trip) {
                if (! $carId) {
                    throw ValidationException::withMessages([
                        'car_id' => ['Sélectionnez le véhicule utilisé pour ce trajet.'],
                    ]);
                }

                $car = Car::where('id', $carId)->where('driver_id', $driver->id)->where('is_active', true)->first();

                if (! $car) {
                    throw ValidationException::withMessages([
                        'car_id' => ['Véhicule invalide ou inactif.'],
                    ]);
                }

                $pricePerSeat = (int) round($locked->fare_total / $locked->seats_requested);

                $trip = DemLeguiTrip::create([
                    'driver_id' => $driver->id,
                    'car_id' => $car->id,
                    'destination_city_id' => $locked->destination_city_id,
                    'total_seats' => $car->seats,
                    'available_seats' => $car->seats - $locked->seats_requested,
                    'price_per_seat' => $pricePerSeat,
                    'status' => DemLeguiTrip::STATUS_OPEN,
                ]);
            } else {
                $trip->decrement('available_seats', $locked->seats_requested);
            }

            $locked->update([
                'status' => DemLeguiRequest::STATUS_MATCHED,
                'dem_legui_trip_id' => $trip->id,
            ]);

            if ($locked->payment_method === DemLeguiRequest::PAYMENT_METHOD_WALLET) {
                $walletService->charge($locked->rider, $locked->fare_total, null, "Paiement Dem Légui #{$locked->id}");
                $walletService->credit($driver, $locked->fare_total, null, WalletTransaction::TYPE_EARNING, "Revenu Dem Légui #{$locked->id}");
            }

            return $trip;
        });

        DemLeguiRequestMatched::dispatch($demLeguiRequest->fresh());

        return new DemLeguiTripResource($trip->fresh(['driver.driverProfile', 'car', 'destinationCity', 'requests.rider']));
    }

    public function showTrip(Request $request, DemLeguiTrip $demLeguiTrip)
    {
        $user = $request->user();
        $isDriver = $demLeguiTrip->driver_id === $user->id;
        $isAttachedRider = $demLeguiTrip->requests()->where('rider_id', $user->id)->exists();

        abort_unless($isDriver || $isAttachedRider, 404);

        return new DemLeguiTripResource($demLeguiTrip->load(['driver.driverProfile', 'car', 'destinationCity', 'requests.rider']));
    }

    public function myTrips(Request $request)
    {
        $trips = $request->user()->demLeguiTrips()
            ->with(['car', 'destinationCity'])
            ->withCount('requests')
            ->latest()
            ->paginate(20);

        return DemLeguiTripResource::collection($trips);
    }

    /**
     * Driver marks having reached the rider's pickup point — an
     * informational checkpoint distinct from startTrip() (which actually
     * gets the ride moving), so it's only meaningful while still en route.
     */
    public function arrivedAtPickup(Request $request, DemLeguiTrip $demLeguiTrip)
    {
        abort_unless($demLeguiTrip->driver_id === $request->user()->id, 404);

        if ($demLeguiTrip->status !== DemLeguiTrip::STATUS_OPEN) {
            return response()->json(['message' => "Ce trajet Dem Légui n'est plus en attente de prise en charge."], 422);
        }

        $demLeguiTrip->update(['arrived_at' => now()]);

        return new DemLeguiTripResource($demLeguiTrip->load(['driver.driverProfile', 'car', 'destinationCity', 'requests.rider']));
    }

    public function startTrip(Request $request, DemLeguiTrip $demLeguiTrip)
    {
        abort_unless($demLeguiTrip->driver_id === $request->user()->id, 404);

        if ($demLeguiTrip->status !== DemLeguiTrip::STATUS_OPEN) {
            return response()->json(['message' => 'Ce trajet Dem Légui ne peut pas être démarré.'], 422);
        }

        $demLeguiTrip->update(['status' => DemLeguiTrip::STATUS_IN_PROGRESS, 'started_at' => now()]);

        return new DemLeguiTripResource($demLeguiTrip->load(['driver.driverProfile', 'car', 'destinationCity', 'requests.rider']));
    }

    public function completeTrip(Request $request, DemLeguiTrip $demLeguiTrip, CommissionService $commission)
    {
        abort_unless($demLeguiTrip->driver_id === $request->user()->id, 404);

        if ($demLeguiTrip->status !== DemLeguiTrip::STATUS_IN_PROGRESS) {
            return response()->json(['message' => "Ce trajet Dem Légui doit d'abord être démarré."], 422);
        }

        DB::transaction(function () use ($demLeguiTrip, $commission) {
            $demLeguiTrip->update(['status' => DemLeguiTrip::STATUS_COMPLETED, 'completed_at' => now()]);

            foreach ($demLeguiTrip->requests()->where('status', DemLeguiRequest::STATUS_MATCHED)->get() as $attachedRequest) {
                $commission->applyToDemLeguiRequest($attachedRequest);
            }
        });

        return new DemLeguiTripResource($demLeguiTrip->fresh(['driver.driverProfile', 'car', 'destinationCity', 'requests.rider']));
    }

    /**
     * Driver-reported position while the trip is under way — polled by
     * every attached rider via showTrip(), same "recent position on an
     * interval" honesty already used by Anando's live map.
     */
    public function updateTripLocation(UpdateDemLeguiTripLocationRequest $request, DemLeguiTrip $demLeguiTrip)
    {
        abort_unless($demLeguiTrip->driver_id === $request->user()->id, 404);

        if ($demLeguiTrip->status !== DemLeguiTrip::STATUS_IN_PROGRESS) {
            return response()->json(['message' => 'Ce trajet Dem Légui doit être en cours pour partager la position.'], 422);
        }

        $demLeguiTrip->update([
            'current_latitude' => $request->validated('latitude'),
            'current_longitude' => $request->validated('longitude'),
            'current_location_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Position mise à jour.']);
    }

    /**
     * SOS "share my live position" link, available to the driver and any
     * rider whose request is attached to this trip.
     */
    public function shareLink(Request $request, DemLeguiTrip $demLeguiTrip, TrackingLinkService $trackingLinks)
    {
        $user = $request->user();
        $isParticipant = $demLeguiTrip->driver_id === $user->id
            || $demLeguiTrip->requests()->where('rider_id', $user->id)->exists();

        abort_unless($isParticipant, 404);

        return response()->json(['url' => $trackingLinks->generateUrl('dem-legui', $demLeguiTrip->id)]);
    }

    /**
     * Panic button: the driver or any attached rider signals an emergency,
     * raising a high-severity SecurityAlert the admin team sees on their
     * alerts dashboard.
     */
    public function sos(Request $request, DemLeguiTrip $demLeguiTrip, SecurityAlertService $alerts, TrackingLinkService $trackingLinks)
    {
        $user = $request->user();
        $isParticipant = $demLeguiTrip->driver_id === $user->id
            || $demLeguiTrip->requests()->where('rider_id', $user->id)->exists();

        abort_unless($isParticipant, 404);

        $data = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $alerts->record(
            SecurityAlert::TYPE_RIDER_SOS,
            SecurityAlert::SEVERITY_HIGH,
            "Alerte SOS déclenchée par {$user->name} sur la course Dem Légui #{$demLeguiTrip->id} (→ {$demLeguiTrip->destinationCity?->name}).",
            $user,
            [
                'kind' => 'dem-legui',
                'ride_id' => $demLeguiTrip->id,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'tracking_url' => $trackingLinks->generateUrl('dem-legui', $demLeguiTrip->id),
            ],
        );

        return response()->json(['message' => 'Alerte SOS envoyée.']);
    }
}
