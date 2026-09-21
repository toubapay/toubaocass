<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminTripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'origin_city' => $this->originCity?->name,
            'destination_city' => $this->destinationCity?->name,
            'departure_date' => $this->departure_date,
            'departure_time' => $this->departure_time,
            'fare' => $this->fare,
            'ride_type' => $this->ride_type,
            'total_seats' => $this->total_seats,
            'available_seats' => $this->available_seats,
            'confirmed_bookings_count' => $this->bookings_count ?? 0,
            'driver_id' => $this->driver_id,
            'driver_name' => $this->driver?->name,
            'driver_phone' => $this->driver?->phone,
            'car' => $this->car ? trim("{$this->car->make} {$this->car->model} ({$this->car->plate_number})") : null,
            'created_at' => $this->created_at,
        ];
    }
}
