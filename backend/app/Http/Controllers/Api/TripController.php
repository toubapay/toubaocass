<?php

namespace App\Http\Controllers\Api;

use App\Events\InstantTripPosted;
use App\Events\TripCancelled;
use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\StoreInstantTripRequest;
use App\Http\Requests\Driver\StoreTripRequest;
use App\Http\Requests\Driver\UpdateTripRequest;
use App\Http\Requests\Rider\SearchTripsRequest;
use App\Http\Resources\TripResource;
use App\Models\Booking;
use App\Models\Car;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Services\CommissionService;
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

        if (! in_array($trip->status, [Trip::STATUS_SCHEDULED, Trip::STATUS_FULL], true)) {
            return response()->json(['message' => 'Seul un trajet programmé peut être démarré.'], 422);
        }

        $trip->update(['status' => Trip::STATUS_IN_PROGRESS]);

        return new TripResource($trip->fresh(['car', 'originCity', 'destinationCity']));
    }

    public function complete(Request $request, Trip $trip)
    {
        $this->authorize('update', $trip);

        if ($trip->status !== Trip::STATUS_IN_PROGRESS) {
            return response()->json(['message' => 'Seul un trajet en cours peut être terminé.'], 422);
        }

        DB::transaction(function () use ($trip) {
            $trip->update(['status' => Trip::STATUS_COMPLETED]);

            $trip->bookings()->where('status', Booking::STATUS_CONFIRMED)->get()->each(
                fn (Booking $booking) => $this->commissionService->applyToBooking($booking),
            );
        });

        return new TripResource($trip->fresh(['car', 'originCity', 'destinationCity']));
    }

    public function cancel(Request $request, Trip $trip)
    {
        $this->authorize('delete', $trip);

        if (in_array($trip->status, [Trip::STATUS_CANCELLED, Trip::STATUS_COMPLETED], true)) {
            return response()->json(['message' => 'Ce trajet ne peut plus être annulé.'], 422);
        }

        $trip->update(['status' => Trip::STATUS_CANCELLED]);
        $trip->bookings()->where('status', Booking::STATUS_CONFIRMED)->update(['status' => Booking::STATUS_CANCELLED]);

        TripCancelled::dispatch($trip);

        return response()->json(['message' => 'Trajet annulé.']);
    }
}
