<?php

namespace App\Http\Resources;

use App\Models\DriverProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DriverProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->resource === null) {
            return [
                'id' => null,
                'license_number' => null,
                'license_expiry' => null,
                'kyc_status' => DriverProfile::STATUS_PENDING,
                'kyc_rejection_reason' => null,
                'rating' => 5.0,
                'approved_at' => null,
            ];
        }

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
