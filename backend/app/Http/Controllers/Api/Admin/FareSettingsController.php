<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateFareSettingsRequest;
use App\Services\AuditLogService;
use App\Services\CommissionService;
use App\Services\DeliveryPricingService;
use App\Services\PlatformSettingsService;

class FareSettingsController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings,
        private readonly DeliveryPricingService $pricing,
        private readonly CommissionService $commission,
        private readonly AuditLogService $auditLog,
    ) {}

    public function index()
    {
        return response()->json($this->currentSettings());
    }

    public function update(UpdateFareSettingsRequest $request)
    {
        $admin = $request->user();

        $keys = [
            'delivery_base_fee' => DeliveryPricingService::BASE_FEE_KEY,
            'delivery_fee_per_km' => DeliveryPricingService::FEE_PER_KM_KEY,
            'commission_rate_trip' => CommissionService::RATE_KEY_TRIP,
            'commission_rate_delivery' => CommissionService::RATE_KEY_DELIVERY,
        ];

        $changed = [];

        foreach ($keys as $field => $settingKey) {
            if ($request->filled($field)) {
                $this->settings->set($settingKey, (string) $request->input($field), $admin);
                $changed[$field] = $request->input($field);
            }
        }

        if ($changed !== []) {
            $this->auditLog->record($admin, 'fares.update', 'Mise à jour des tarifs et de la commission.', metadata: $changed);
        }

        return response()->json($this->currentSettings());
    }

    private function currentSettings(): array
    {
        return [
            'delivery_base_fee' => $this->pricing->baseFee(),
            'delivery_fee_per_km' => $this->pricing->feePerKm(),
            'commission_rate_trip' => $this->commission->tripRate(),
            'commission_rate_delivery' => $this->commission->deliveryRate(),
        ];
    }
}
