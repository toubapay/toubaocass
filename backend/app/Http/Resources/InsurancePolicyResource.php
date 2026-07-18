<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InsurancePolicyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'car' => new CarResource($this->whenLoaded('car')),
            'provider' => [
                'id' => $this->provider->id,
                'name' => $this->provider->name,
            ],
            'coverage_type' => $this->coverage_type,
            'plan_name' => $this->plan_name,
            'annual_premium' => $this->annual_premium,
            'policy_number' => $this->policy_number,
            'starts_at' => $this->starts_at->toDateString(),
            'ends_at' => $this->ends_at->toDateString(),
            'status' => $this->status,
            'is_active' => $this->isActive(),
            'created_at' => $this->created_at,
        ];
    }
}
