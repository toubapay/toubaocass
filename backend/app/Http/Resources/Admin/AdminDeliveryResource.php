<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminDeliveryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'package_type' => $this->package_type,
            'pickup_address_line' => $this->pickup_address_line,
            'receiver_name' => $this->receiver_name,
            'receiver_address_line' => $this->receiver_address_line,
            'fee' => $this->fee,
            'sender_id' => $this->sender_id,
            'sender_name' => $this->sender?->name,
            'sender_phone' => $this->sender?->phone,
            'driver_id' => $this->driver_id,
            'driver_name' => $this->driver?->name,
            'driver_phone' => $this->driver?->phone,
            'created_at' => $this->created_at,
        ];
    }
}
