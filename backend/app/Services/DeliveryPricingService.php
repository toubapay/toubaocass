<?php

namespace App\Services;

use App\Support\Geo;

class DeliveryPricingService
{
    const BASE_FEE_KEY = 'delivery_base_fee';

    const FEE_PER_KM_KEY = 'delivery_fee_per_km';

    public function __construct(private readonly PlatformSettingsService $settings) {}

    /**
     * @return array{distance_km: float, fee: int}
     */
    public function quote(float $pickupLat, float $pickupLng, float $dropLat, float $dropLng): array
    {
        $distanceKm = Geo::haversineKm($pickupLat, $pickupLng, $dropLat, $dropLng);
        $fee = (int) round($this->baseFee() + $distanceKm * $this->feePerKm());

        return [
            'distance_km' => round($distanceKm, 2),
            'fee' => $fee,
        ];
    }

    /**
     * Admin-configurable in the database; the .env value (kept for backward
     * compatibility with existing deploys) is only the fallback default
     * until a super_admin/accountant sets an explicit override.
     */
    public function baseFee(): float
    {
        return (float) $this->settings->get(self::BASE_FEE_KEY, (string) config('services.delivery.base_fee'));
    }

    public function feePerKm(): float
    {
        return (float) $this->settings->get(self::FEE_PER_KM_KEY, (string) config('services.delivery.fee_per_km'));
    }
}
