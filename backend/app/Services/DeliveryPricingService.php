<?php

namespace App\Services;

use App\Support\Geo;

class DeliveryPricingService
{
    /**
     * @return array{distance_km: float, fee: int}
     */
    public function quote(float $pickupLat, float $pickupLng, float $dropLat, float $dropLng): array
    {
        $distanceKm = Geo::haversineKm($pickupLat, $pickupLng, $dropLat, $dropLng);
        $fee = (int) round(config('services.delivery.base_fee') + $distanceKm * config('services.delivery.fee_per_km'));

        return [
            'distance_km' => round($distanceKm, 2),
            'fee' => $fee,
        ];
    }
}
