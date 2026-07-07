<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DriverProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'license_number' => $this->license_number,
            'license_expiry' => $this->license_expiry,
            'kyc_status' => $this->kyc_status,
            'kyc_rejection_reason' => $this->kyc_rejection_reason,
            'rating' => (float) $this->rating,
            'approved_at' => $this->approved_at,
        ];
    }
}
