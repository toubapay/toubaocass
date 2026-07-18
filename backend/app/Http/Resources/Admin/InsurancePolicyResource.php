<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InsurancePolicyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'driver_name' => $this->driver->name,
            'driver_phone' => $this->driver->phone,
            'car' => trim("{$this->car->make} {$this->car->model} ({$this->car->plate_number})"),
            'provider_name' => $this->provider->name,
            'coverage_type' => $this->coverage_type,
            'plan_name' => $this->plan_name,
            'annual_premium' => $this->annual_premium,
            'commission_amount' => $this->commission_amount,
            'commission_rate' => $this->commission_rate === null ? null : (float) $this->commission_rate,
            'policy_number' => $this->policy_number,
            'starts_at' => $this->starts_at->toDateString(),
            'ends_at' => $this->ends_at->toDateString(),
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
