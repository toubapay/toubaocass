<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DemLeguiTripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'driver' => [
                'id' => $this->driver->id,
                'name' => $this->driver->name,
                'phone' => $this->driver->phone,
                'rating' => (float) ($this->driver->driverProfile?->rating ?? 5.0),
                'current_latitude' => $this->driver->driverProfile?->current_latitude,
                'current_longitude' => $this->driver->driverProfile?->current_longitude,
                'last_seen_at' => $this->driver->driverProfile?->last_seen_at,
            ],
            'car' => new CarResource($this->whenLoaded('car')),
            'destination_city' => new CityResource($this->whenLoaded('destinationCity')),
            'total_seats' => $this->total_seats,
            'available_seats' => $this->available_seats,
            'price_per_seat' => $this->price_per_seat,
            'status' => $this->status,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'arrived_at' => $this->arrived_at,
            'current_latitude' => $this->current_latitude,
            'current_longitude' => $this->current_longitude,
            'current_location_updated_at' => $this->current_location_updated_at,
            'created_at' => $this->created_at,
            'requests' => DemLeguiRequestResource::collection($this->whenLoaded('requests')),
        ];
    }
}
