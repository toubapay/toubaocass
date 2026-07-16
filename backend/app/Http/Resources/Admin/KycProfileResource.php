<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class KycProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'driver_name' => $this->user->name,
            'driver_phone' => $this->user->phone,
            'license_number' => $this->license_number,
            'license_expiry' => $this->license_expiry,
            'national_id_number' => $this->national_id_number,
            'kyc_status' => $this->kyc_status,
            'kyc_rejection_reason' => $this->kyc_rejection_reason,
            'documents' => [
                'id_document' => filled($this->id_document_path),
                'license_document' => filled($this->license_document_path),
                'selfie' => filled($this->selfie_path),
            ],
            'approved_at' => $this->approved_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
