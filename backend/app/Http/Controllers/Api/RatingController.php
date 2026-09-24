<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DriverRatingResource;
use App\Models\Booking;
use App\Models\Delivery;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\Rating;
use App\Models\Trip;
use App\Services\Geo\CityDistanceService;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    /**
     * Driver-facing: the reviews riders/senders have left them, across
     * Trip, Dem Légui, and Delivery — the same three rateable types
     * DriverProfile::rating aggregates (Anando's peer ratings live
     * separately on users.anando_rating and never show up here).
     */
    public function mine(Request $request)
    {
        $ratings = Rating::where('ratee_id', $request->user()->id)
            ->whereIn('rateable_type', [Trip::class, DemLeguiTrip::class, Delivery::class])
            ->with('rater')
            ->latest()
            ->paginate(20);

        return DriverRatingResource::collection($ratings);
    }

    /**
     * Rider-facing: the single most recently completed Trip/Delivery/Dem
     * Légui trip this rider hasn't rated yet, if any — powers the
     * post-completion rating popup on the rider-web home screen. Returns
     * null when there's nothing pending, so the frontend can skip showing
     * anything without a second round trip.
     */
    public function pendingRating(Request $request)
    {
        $rider = $request->user();
        $candidates = collect();

        $notYetRatedBy = function ($query, string $rateableType, string $idColumn) use ($rider) {
            $query->whereNotExists(function ($sub) use ($rateableType, $idColumn, $rider) {
                $sub->selectRaw('1')
                    ->from('ratings')
                    ->whereColumn('ratings.rateable_id', $idColumn)
                    ->where('ratings.rateable_type', $rateableType)
                    ->where('ratings.rater_id', $rider->id);
            });
        };

        $trip = Trip::query()
            ->whereHas('bookings', fn ($q) => $q->where('rider_id', $rider->id)->where('status', Booking::STATUS_CONFIRMED))
            ->where('status', Trip::STATUS_COMPLETED)
            ->tap(fn ($q) => $notYetRatedBy($q, Trip::class, 'trips.id'))
            ->with([
                'driver.driverProfile', 'originCity', 'destinationCity',
                'bookings' => fn ($q) => $q->where('rider_id', $rider->id)->where('status', Booking::STATUS_CONFIRMED),
            ])
            ->latest('updated_at')
            ->first();

        if ($trip) {
            $booking = $trip->bookings->first();
            $route = $trip->originCity && $trip->destinationCity
                ? app(CityDistanceService::class)->between($trip->originCity, $trip->destinationCity)
                : null;

            $candidates->push([
                'sort_at' => $trip->updated_at,
                'data' => [
                    'type' => 'trip',
                    'id' => $trip->id,
                    'driver' => $this->driverPayload($trip->driver),
                    'origin_label' => $trip->originCity?->name,
                    'destination_label' => $trip->destinationCity?->name,
                    'distance_km' => $route?->distance_km,
                    'duration_minutes' => $route?->duration_minutes,
                    'cost' => $booking?->fare_total,
                    'completed_at' => $trip->updated_at,
                ],
            ]);
        }

        $delivery = Delivery::query()
            ->where('sender_id', $rider->id)
            ->where('status', Delivery::STATUS_DELIVERED)
            ->tap(fn ($q) => $notYetRatedBy($q, Delivery::class, 'deliveries.id'))
            ->with('driver.driverProfile')
            ->latest('delivered_at')
            ->first();

        if ($delivery && $delivery->driver) {
            $candidates->push([
                'sort_at' => $delivery->delivered_at,
                'data' => [
                    'type' => 'delivery',
                    'id' => $delivery->id,
                    'driver' => $this->driverPayload($delivery->driver),
                    'origin_label' => $delivery->pickup_address_line,
                    'destination_label' => $delivery->receiver_address_line,
                    'distance_km' => $delivery->distance_km,
                    'duration_minutes' => null,
                    'cost' => $delivery->fee,
                    'completed_at' => $delivery->delivered_at,
                ],
            ]);
        }

        $demLeguiTrip = DemLeguiTrip::query()
            ->whereHas('requests', fn ($q) => $q->where('rider_id', $rider->id)->where('status', DemLeguiRequest::STATUS_MATCHED))
            ->where('status', DemLeguiTrip::STATUS_COMPLETED)
            ->tap(fn ($q) => $notYetRatedBy($q, DemLeguiTrip::class, 'dem_legui_trips.id'))
            ->with([
                'driver.driverProfile', 'destinationCity',
                'requests' => fn ($q) => $q->where('rider_id', $rider->id)->where('status', DemLeguiRequest::STATUS_MATCHED),
            ])
            ->latest('completed_at')
            ->first();

        if ($demLeguiTrip) {
            $matchedRequest = $demLeguiTrip->requests->first();

            $candidates->push([
                'sort_at' => $demLeguiTrip->completed_at,
                'data' => [
                    'type' => 'dem_legui',
                    'id' => $demLeguiTrip->id,
                    'driver' => $this->driverPayload($demLeguiTrip->driver),
                    'origin_label' => $matchedRequest?->pickup_address,
                    'destination_label' => $demLeguiTrip->destinationCity?->name,
                    'distance_km' => null,
                    'duration_minutes' => null,
                    'cost' => $matchedRequest?->fare_total,
                    'completed_at' => $demLeguiTrip->completed_at,
                ],
            ]);
        }

        $best = $candidates->sortByDesc(fn ($c) => $c['sort_at'])->first();

        return response()->json(['data' => $best['data'] ?? null]);
    }

    private function driverPayload($driver): array
    {
        return [
            'id' => $driver->id,
            'name' => $driver->name,
            'phone' => $driver->phone,
            'rating' => (float) ($driver->driverProfile?->rating ?? 5.0),
            'tier' => $driver->driverProfile?->tier,
        ];
    }
}
