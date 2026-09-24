<?php

namespace App\Http\Controllers\Api;

use App\Events\InstantTripPosted;
use App\Events\TripCancelled;
use App\Events\TripCompleted;
use App\Events\TripDriverArrived;
use App\Events\TripStarted;
use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\StoreInstantTripRequest;
use App\Http\Requests\Driver\StoreTripRequest;
use App\Http\Requests\Driver\UpdateTripRequest;
use App\Http\Requests\RateTripRequest;
use App\Http\Requests\Rider\SearchTripsRequest;
use App\Http\Requests\UpdateTripLocationRequest;
use App\Http\Resources\TripResource;
use App\Models\Booking;
use App\Models\Car;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\SecurityAlert;
use App\Models\WalletTransaction;
use App\Services\CommissionService;
use App\Services\RatingService;
use App\Services\SecurityAlertService;
use App\Services\TrackingLinkService;
use App\Services\WalletService;
use App\Support\Geo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TripController extends Controller
{
    /**
     * How long an instant-posted trip stays bookable after the driver
     * posts it, before the existing past-departure protections kick in.
     */
    public const INSTANT_GRACE_MINUTES = 20;

    public function __construct(private readonly CommissionService $commissionService) {}

    /**
     * Rider-facing search across available trips.
     */
    public function search(SearchTripsRequest $request)
    {
        $seats = (int) $request->input('seats', 1);
        $hasGeo = $request->filled('lat') && $request->filled('lng');
        $rider = $request->user();

        $trips = Trip::query()
            ->with([
                'driver.driverProfile', 'car', 'originCity', 'destinationCity',
                'riderBooking' => fn ($q) => $q->where('rider_id', $rider->id)->where('status', Booking::STATUS_CONFIRMED),
            ])
            ->where('status', Trip::STATUS_SCHEDULED)
            ->where('available_seats', '>=', $seats)
            ->when($request->filled('origin_city_id'), fn ($q) => $q->where('origin_city_id', $request->input('origin_city_id')))
            ->when($request->filled('destination_city_id'), fn ($q) => $q->where('destination_city_id', $request->input('destination_city_id')))
            ->when($request->filled('date'), fn ($q) => $q->whereDate('departure_date', $request->input('date')))
            ->when($request->filled('ride_type'), fn ($q) => $q->where('ride_type', $request->input('ride_type')))
            ->where(function ($q) {
                $q->where('departure_date', '>', now()->toDateString())
                    ->orWhere(function ($q) {
                        $q->where('departure_date', now()->toDateString())
                            ->where('departure_time', '>=', now()->format('H:i'));
                    });
            })
            ->when(
                $hasGeo,
                function ($q) use ($request) {
                    $lat = (float) $request->input('lat');
                    $lng = (float) $request->input('lng');
                    $radius = (float) $request->input('radius_km', 50);
                    $expr = Geo::distanceExpression();

                    $q->whereNotNull('departure_latitude')
                        ->whereNotNull('departure_longitude')
                        ->selectRaw('trips.*')
                        ->selectRaw("{$expr} as distance_km", [$lat, $lng, $lat])
                        ->whereRaw("{$expr} <= ?", [$lat, $lng, $lat, $radius])
                        ->orderByRaw($expr, [$lat, $lng, $lat]);
                },
                fn ($q) => $q->orderBy('departure_date')->orderBy('departure_time'),
            )
            ->paginate(20);

        return TripResource::collection($trips);
    }

    /**
     * "Instant Post" style departures — trips a driver posted without
     * scheduling ahead, still open for booking right now. Backs the
     * home-screen badge/list rather than the full search filters above.
     */
    public function instantIndex(Request $request)
    {
        $rider = $request->user();

        $trips = Trip::query()
            ->with([
                'driver.driverProfile', 'car', 'originCity', 'destinationCity',
                'riderBooking' => fn ($q) => $q->where('rider_id', $rider->id)->where('status', Booking::STATUS_CONFIRMED),
            ])
            ->where('is_instant', true)
            ->where('status', Trip::STATUS_SCHEDULED)
            ->where('available_seats', '>', 0)
            ->where(function ($q) {
                $q->where('departure_date', '>', now()->toDateString())
                    ->orWhere(function ($q) {
                        $q->where('departure_date', now()->toDateString())
                            ->where('departure_time', '>=', now()->format('H:i'));
                    });
            })
            ->latest()
            ->get();

        return TripResource::collection($trips);
    }

    public function show(Request $request, Trip $trip)
    {
        return new TripResource($trip->load([
            'driver.driverProfile', 'car', 'originCity', 'destinationCity',
            'riderBooking' => fn ($q) => $q->where('rider_id', $request->user()->id)->where('status', Booking::STATUS_CONFIRMED),
        ]));
    }

    /**
     * Rider-facing: the rider's currently in-progress trip with a confirmed
     * booking, if any — powers a persistent status widget shown on Home
     * without the caller needing to already know a trip id, same pattern as
     * DemLeguiController::myActiveRequest().
     */
    public function myActiveTrip(Request $request)
    {
        $rider = $request->user();

        $trip = Trip::query()
            ->where('status', Trip::STATUS_IN_PROGRESS)
            ->whereHas('bookings', fn ($q) => $q->where('rider_id', $rider->id)->where('status', Booking::STATUS_CONFIRMED))
            ->with([
                'driver.driverProfile', 'car', 'originCity', 'destinationCity',
                'riderBooking' => fn ($q) => $q->where('rider_id', $rider->id)->where('status', Booking::STATUS_CONFIRMED),
            ])
            ->latest('started_at')
            ->first();

        return response()->json(['data' => $trip ? new TripResource($trip) : null]);
    }

    /**
     * SOS "share my live position" link, available to the driver and any
     * rider with a confirmed seat — anyone actually on the trip may want to
     * let their own family follow along, not just the driver.
     */
    public function shareLink(Request $request, Trip $trip, TrackingLinkService $trackingLinks)
    {
        $user = $request->user();
        $isParticipant = $trip->driver_id === $user->id
            || Booking::where('trip_id', $trip->id)->where('rider_id', $user->id)->where('status', Booking::STATUS_CONFIRMED)->exists();

        abort_unless($isParticipant, 404);

        return response()->json(['url' => $trackingLinks->generateUrl('trip', $trip->id)]);
    }

    /**
     * Panic button: the driver or any confirmed rider on this trip signals
     * an emergency, raising a high-severity SecurityAlert the admin team
     * sees on their alerts dashboard.
     */
    public function sos(Request $request, Trip $trip, SecurityAlertService $alerts, TrackingLinkService $trackingLinks)
    {
        $user = $request->user();
        $isParticipant = $trip->driver_id === $user->id
            || Booking::where('trip_id', $trip->id)->where('rider_id', $user->id)->where('status', Booking::STATUS_CONFIRMED)->exists();

        abort_unless($isParticipant, 404);

        $data = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $riders = Booking::where('trip_id', $trip->id)->where('status', Booking::STATUS_CONFIRMED)->with('rider')->get();

        $alerts->record(
            SecurityAlert::TYPE_RIDER_SOS,
            SecurityAlert::SEVERITY_HIGH,
            "Alerte SOS déclenchée par {$user->name} sur le trajet #{$trip->id} ({$trip->originCity?->name} → {$trip->destinationCity?->name}).",
            $user,
            [
                'kind' => 'trip',
                'ride_id' => $trip->id,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'tracking_url' => $trackingLinks->generateUrl('trip', $trip->id),
                'parties' => [
                    ['role' => 'driver', 'name' => $trip->driver?->name, 'phone' => $trip->driver?->phone],
                    ...$riders->map(fn (Booking $booking) => ['role' => 'rider', 'name' => $booking->rider?->name, 'phone' => $booking->rider?->phone])->all(),
                ],
            ],
        );

        return response()->json(['message' => 'Alerte SOS envoyée.']);
    }

    /**
     * Driver-facing list of their own posted trips.
     */
    public function driverIndex(Request $request)
    {
        $trips = $request->user()->trips()
            ->with(['car', 'originCity', 'destinationCity'])
            ->withCount(['bookings' => fn ($q) => $q->where('status', Booking::STATUS_CONFIRMED)])
            ->latest()
            ->paginate(20);

        return TripResource::collection($trips);
    }

    public function driverShow(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        return new TripResource($trip->load([
            'car', 'originCity', 'destinationCity',
            'bookings' => fn ($q) => $q->where('status', Booking::STATUS_CONFIRMED)->with('rider'),
        ]));
    }

    public function store(StoreTripRequest $request)
    {
        $user = $request->user();

        if ($user->driverProfile?->kyc_status !== DriverProfile::STATUS_APPROVED) {
            throw ValidationException::withMessages([
                'kyc' => ['Votre vérification conducteur (KYC) doit être approuvée avant de pouvoir publier des trajets.'],
            ]);
        }

        $car = Car::findOrFail($request->validated('car_id'));

        $trip = $user->trips()->create([
            ...$request->validated(),
            'total_seats' => $car->seats,
            'available_seats' => $car->seats,
            'status' => Trip::STATUS_SCHEDULED,
        ]);

        return new TripResource($trip->load(['car', 'originCity', 'destinationCity']));
    }

    /**
     * "Instant Post" style publish — no date/time picker, the driver is
     * leaving right away. departure_date/departure_time still get a real
     * value (now + a short grace window) rather than the exact posting
     * instant, so the trip stays bookable for a few minutes instead of
     * immediately tripping the past-departure block every other booking
     * path already enforces (Trip::hasDeparted()).
     */
    public function storeInstant(StoreInstantTripRequest $request)
    {
        $user = $request->user();

        if ($user->driverProfile?->kyc_status !== DriverProfile::STATUS_APPROVED) {
            throw ValidationException::withMessages([
                'kyc' => ['Votre vérification conducteur (KYC) doit être approuvée avant de pouvoir publier des trajets.'],
            ]);
        }

        $car = Car::findOrFail($request->validated('car_id'));
        $departsAt = now()->addMinutes(self::INSTANT_GRACE_MINUTES);

        $trip = $user->trips()->create([
            ...$request->validated(),
            'departure_date' => $departsAt->toDateString(),
            'departure_time' => $departsAt->format('H:i'),
            'total_seats' => $car->seats,
            'available_seats' => $car->seats,
            'status' => Trip::STATUS_SCHEDULED,
            'is_instant' => true,
        ]);

        $trip->load(['car', 'originCity', 'destinationCity']);

        InstantTripPosted::dispatch($trip);

        return new TripResource($trip);
    }

    public function update(UpdateTripRequest $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        $trip->update($request->validated());

        return new TripResource($trip->fresh(['car', 'originCity', 'destinationCity']));
    }

    public function start(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        try {
            DB::transaction(function () use ($trip) {
                /** @var Trip $locked */
                $locked = Trip::where('id', $trip->id)->lockForUpdate()->firstOrFail();

                if (! in_array($locked->status, [Trip::STATUS_SCHEDULED, Trip::STATUS_FULL], true)) {
                    throw new \RuntimeException('Seul un trajet programmé peut être démarré.');
                }

                $locked->update(['status' => Trip::STATUS_IN_PROGRESS, 'started_at' => now()]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        TripStarted::dispatch($trip->fresh());

        return new TripResource($trip->fresh(['car', 'originCity', 'destinationCity']));
    }

    /**
     * Driver marks having reached the meeting point — an informational
     * checkpoint distinct from start() (which actually gets passengers
     * moving), so it's only meaningful before the trip is under way.
     */
    public function arrived(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        try {
            DB::transaction(function () use ($trip) {
                /** @var Trip $locked */
                $locked = Trip::where('id', $trip->id)->lockForUpdate()->firstOrFail();

                if (! in_array($locked->status, [Trip::STATUS_SCHEDULED, Trip::STATUS_FULL], true)) {
                    throw new \RuntimeException('Seul un trajet programmé peut être marqué comme "arrivé".');
                }

                $locked->update(['arrived_at' => now()]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        TripDriverArrived::dispatch($trip->fresh());

        return new TripResource($trip->fresh(['car', 'originCity', 'destinationCity']));
    }

    public function complete(Request $request, Trip $trip, WalletService $walletService)
    {
        $this->authorize('update', $trip);

        try {
            DB::transaction(function () use ($trip, $walletService) {
                /** @var Trip $locked */
                $locked = Trip::where('id', $trip->id)->lockForUpdate()->firstOrFail();

                if ($locked->status !== Trip::STATUS_IN_PROGRESS) {
                    throw new \RuntimeException('Seul un trajet en cours peut être terminé.');
                }

                $locked->update(['status' => Trip::STATUS_COMPLETED]);

                // Money moves here, at completion, not at booking time — a
                // wallet-paying rider is charged and the driver credited net
                // of commission only once the trip actually happened. A
                // rider's insufficient balance never blocks the driver from
                // completing a trip they already drove: debit() (unlike
                // charge()) allows the balance to go negative rather than
                // throwing. Cash bookings never touch the rider's wallet —
                // that fare was paid straight to the driver in person — but
                // the driver's earnings ledger still records it.
                $locked->bookings()->where('status', Booking::STATUS_CONFIRMED)->get()->each(function (Booking $booking) use ($walletService, $locked) {
                    $booking = $this->commissionService->applyToBooking($booking);
                    $net = $booking->fare_total - $booking->commission_amount;

                    if ($booking->payment_method === Booking::PAYMENT_METHOD_WALLET) {
                        $walletService->debit($booking->rider, $booking->fare_total, $booking, WalletTransaction::TYPE_PAYMENT, 'Paiement de réservation (trajet terminé)');
                    }

                    $walletService->credit($locked->driver, $net, $booking, WalletTransaction::TYPE_EARNING, 'Revenu de réservation (trajet terminé)');
                });
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        TripCompleted::dispatch($trip->fresh());

        return new TripResource($trip->fresh(['car', 'originCity', 'destinationCity']));
    }

    /**
     * Rider leaves a 1-5 star review of the driver after a completed trip.
     * One-directional (rider -> driver only, unlike Anando's bidirectional
     * rating) — re-rating the same trip updates the existing review.
     */
    public function rate(RateTripRequest $request, Trip $trip, RatingService $ratingService)
    {
        $rider = $request->user();

        if ($trip->status !== Trip::STATUS_COMPLETED) {
            return response()->json(['message' => 'Ce trajet doit être terminé avant de laisser un avis.'], 422);
        }

        $hasBooking = $trip->bookings()->where('rider_id', $rider->id)->where('status', Booking::STATUS_CONFIRMED)->exists();

        if (! $hasBooking) {
            throw ValidationException::withMessages(['trip' => ["Vous n'avez pas de réservation confirmée sur ce trajet."]]);
        }

        $ratingService->submitRating($trip, $rider, $trip->driver, (int) $request->validated('score'), $request->validated('comment'));

        return response()->json(['message' => 'Avis enregistré.']);
    }

    /**
     * Driver-reported position while the trip is under way — polled by
     * riders via show(), same "recent position on an interval" honesty as
     * Anando/Dem Légui's own live tracking, not a persistent connection.
     */
    public function updateLocation(UpdateTripLocationRequest $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        if ($trip->status !== Trip::STATUS_IN_PROGRESS) {
            return response()->json(['message' => 'Ce trajet doit être en cours pour partager la position.'], 422);
        }

        $trip->update([
            'current_latitude' => $request->validated('latitude'),
            'current_longitude' => $request->validated('longitude'),
            'current_location_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Position mise à jour.']);
    }

    public function cancel(Request $request, Trip $trip)
    {
        $this->authorize('delete', $trip);

        try {
            DB::transaction(function () use ($trip) {
                /** @var Trip $locked */
                $locked = Trip::where('id', $trip->id)->lockForUpdate()->firstOrFail();

                if (in_array($locked->status, [Trip::STATUS_CANCELLED, Trip::STATUS_COMPLETED], true)) {
                    throw new \RuntimeException('Ce trajet ne peut plus être annulé.');
                }

                // No wallet refund needed — nobody was ever charged (payment
                // only happens at trip completion, see complete()).
                $locked->bookings()->where('status', Booking::STATUS_CONFIRMED)->update(['status' => Booking::STATUS_CANCELLED]);

                $locked->update(['status' => Trip::STATUS_CANCELLED]);
            });
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        TripCancelled::dispatch($trip->fresh());

        return response()->json(['message' => 'Trajet annulé.']);
    }
}
