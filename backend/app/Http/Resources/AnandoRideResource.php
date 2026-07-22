<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnandoRideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'poster' => [
                'id' => $this->poster->id,
                'name' => $this->poster->name,
                'phone' => $this->poster->phone,
                'role' => $this->poster->role,
            ],
            'origin_city' => new CityResource($this->whenLoaded('originCity')),
            'destination_city' => new CityResource($this->whenLoaded('destinationCity')),
            'departure_point' => $this->departure_point,
            'departure_latitude' => $this->departure_latitude,
            'departure_longitude' => $this->departure_longitude,
            'departure_at' => $this->departure_at,
            'price_per_seat' => $this->price_per_seat,
            'total_seats' => $this->total_seats,
            'available_seats' => $this->available_seats,
            'vehicle_info' => $this->vehicle_info,
            'notes' => $this->notes,
            'status' => $this->status,
            'is_joinable' => $this->isJoinable(),
            'is_mine' => $request->user() && $request->user()->id === $this->user_id,
            'created_at' => $this->created_at,
            'bookings' => AnandoRideBookingResource::collection($this->whenLoaded('bookings')),
        ];
    }
}
