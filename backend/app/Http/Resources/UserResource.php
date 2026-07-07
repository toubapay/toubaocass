<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'role' => $this->role,
            'phone_verified' => $this->phone_verified_at !== null,
            'profile_complete' => filled($this->name),
            'driver_profile' => new DriverProfileResource($this->whenLoaded('driverProfile')),
            'created_at' => $this->created_at,
        ];
    }
}
