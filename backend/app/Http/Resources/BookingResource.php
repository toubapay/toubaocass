<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'trip' => new TripResource($this->whenLoaded('trip')),
            'rider' => [
                'id' => $this->rider->id,
                'name' => $this->rider->name,
                'phone' => $this->rider->phone,
            ],
            'seats_booked' => $this->seats_booked,
            'fare_total' => $this->fare_total,
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
