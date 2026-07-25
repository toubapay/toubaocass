<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DemLeguiRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rider' => [
                'id' => $this->rider->id,
                'name' => $this->rider->name,
                'phone' => $this->rider->phone,
            ],
            'pickup_latitude' => $this->pickup_latitude,
            'pickup_longitude' => $this->pickup_longitude,
            'pickup_address' => $this->pickup_address,
            'destination_city' => new CityResource($this->whenLoaded('destinationCity')),
            'destination_address' => $this->destination_address,
            'seats_requested' => $this->seats_requested,
            'fare_total' => $this->fare_total,
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            'dem_legui_trip_id' => $this->dem_legui_trip_id,
            'created_at' => $this->created_at,
        ];
    }
}
