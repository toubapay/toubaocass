<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserSummaryResource extends JsonResource
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
            'kyc_status' => $this->whenLoaded('driverProfile', fn () => $this->driverProfile?->kyc_status),
            'created_at' => $this->created_at,
        ];
    }
}
