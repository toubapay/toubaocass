<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateFareSettingsRequest;
use App\Services\AuditLogService;
use App\Services\CommissionService;
use App\Services\DeliveryPricingService;
use App\Services\DemLeguiPricingService;
use App\Services\PlatformSettingsService;

class FareSettingsController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings,
        private readonly DeliveryPricingService $pricing,
        private readonly DemLeguiPricingService $demLeguiPricing,
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
            'dem_legui_base_fare' => DemLeguiPricingService::BASE_FARE_KEY,
            'dem_legui_fare_per_km' => DemLeguiPricingService::FARE_PER_KM_KEY,
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

        // Nullable, unlike the fields above: an explicit null clears the cap
        // (no limit) rather than meaning "leave unchanged", so this checks
        // has() instead of filled().
        if ($request->has('delivery_max_active_per_driver')) {
            $value = $request->input('delivery_max_active_per_driver');
            $this->settings->set(DeliveryPricingService::MAX_ACTIVE_PER_DRIVER_KEY, $value === null ? '' : (string) $value, $admin);
            $changed['delivery_max_active_per_driver'] = $value;
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
            'dem_legui_base_fare' => $this->demLeguiPricing->baseFare(),
            'dem_legui_fare_per_km' => $this->demLeguiPricing->farePerKm(),
            'commission_rate_trip' => $this->commission->tripRate(),
            'commission_rate_delivery' => $this->commission->deliveryRate(),
            'delivery_max_active_per_driver' => $this->pricing->maxActiveDeliveriesPerDriver(),
        ];
    }
}
