<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sender' => [
                'id' => $this->sender->id,
                'name' => $this->sender->name,
                'phone' => $this->sender->phone,
            ],
            'driver' => $this->driver ? [
                'id' => $this->driver->id,
                'name' => $this->driver->name,
                'phone' => $this->driver->phone,
                'rating' => $this->driver->driverProfile?->rating,
            ] : null,
            'receiver_name' => $this->receiver_name,
            'receiver_phone' => $this->receiver_phone,
            'receiver_address_line' => $this->receiver_address_line,
            'receiver_latitude' => $this->receiver_latitude,
            'receiver_longitude' => $this->receiver_longitude,
            'pickup_address_line' => $this->pickup_address_line,
            'pickup_latitude' => $this->pickup_latitude,
            'pickup_longitude' => $this->pickup_longitude,
            'package_type' => $this->package_type,
            'notes' => $this->notes,
            'distance_km' => $this->distance_km,
            'fee' => $this->fee,
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            'accepted_at' => $this->accepted_at,
            'picked_up_at' => $this->picked_up_at,
            'delivered_at' => $this->delivered_at,
            'cancelled_at' => $this->cancelled_at,
            'created_at' => $this->created_at,
        ];
    }
}
