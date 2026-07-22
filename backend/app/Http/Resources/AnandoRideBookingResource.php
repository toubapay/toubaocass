<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnandoRideBookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'anando_ride' => new AnandoRideResource($this->whenLoaded('anandoRide')),
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'phone' => $this->user->phone,
            ],
            'seats_booked' => $this->seats_booked,
            'price_total' => $this->price_total,
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
