<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InsuranceProviderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'commission_rate' => (float) $this->commission_rate,
            'is_active' => $this->is_active,
            // Never expose the raw key — only whether one is configured —
            // so the admin UI can show live-vs-simulated status safely.
            'has_api_credentials' => $this->isLiveIntegrated(),
            'created_at' => $this->created_at,
        ];
    }
}
