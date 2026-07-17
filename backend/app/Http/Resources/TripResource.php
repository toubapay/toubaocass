<?php

namespace App\Http\Resources;

use App\Services\Geo\CityDistanceService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasRoute = $this->relationLoaded('originCity') && $this->relationLoaded('destinationCity')
            && $this->originCity && $this->destinationCity;

        return [
            'id' => $this->id,
            'driver' => [
                'id' => $this->driver->id,
                'name' => $this->driver->name,
                'phone' => $this->driver->phone,
                'rating' => (float) $this->driver->driverProfile?->rating,
            ],
            'car' => new CarResource($this->whenLoaded('car')),
            'origin_city' => new CityResource($this->whenLoaded('originCity')),
            'destination_city' => new CityResource($this->whenLoaded('destinationCity')),
            'departure_latitude' => $this->departure_latitude,
            'departure_longitude' => $this->departure_longitude,
            'departure_address' => $this->departure_address,
            'departure_date' => $this->departure_date->format('Y-m-d'),
            'departure_time' => $this->departure_time,
            'fare' => $this->fare,
            'ride_type' => $this->ride_type,
            'total_seats' => $this->total_seats,
            'available_seats' => $this->available_seats,
            'status' => $this->status,
            'is_bookable' => $this->isBookable(),
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'distance_km' => $this->when(isset($this->distance_km), fn () => round((float) $this->distance_km, 1)),
            'route_distance_km' => $this->when(
                $hasRoute,
                fn () => app(CityDistanceService::class)->between($this->originCity, $this->destinationCity)->distance_km,
            ),
            'route_duration_minutes' => $this->when(
                $hasRoute,
                fn () => app(CityDistanceService::class)->between($this->originCity, $this->destinationCity)->duration_minutes,
            ),
            'bookings' => BookingResource::collection($this->whenLoaded('bookings')),
            'bookings_count' => $this->whenCounted('bookings'),
            'my_booking' => $this->when($this->relationLoaded('riderBooking'), fn () => $this->riderBooking ? [
                'id' => $this->riderBooking->id,
                'seats_booked' => $this->riderBooking->seats_booked,
                'fare_total' => $this->riderBooking->fare_total,
                'status' => $this->riderBooking->status,
            ] : null),
        ];
    }
}
