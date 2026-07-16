<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\DriverProfileResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'phone_verified' => $this->phone_verified_at !== null,
            'created_at' => $this->created_at,
            'driver_profile' => $this->when($this->role === 'driver', fn () => new DriverProfileResource($this->driverProfile)),
            'cars_count' => $this->when($this->role === 'driver', fn () => $this->cars_count),
            'trips_count' => $this->when($this->role === 'driver', fn () => $this->trips_count),
            'bookings_count' => $this->when($this->role === 'rider', fn () => $this->bookings_count),
            'wallet_balance' => $this->whenLoaded('wallet', fn () => $this->wallet?->balance ?? 0),
        ];
    }
}
