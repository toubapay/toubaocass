<?php

namespace App\Services;

use App\Models\City;
use App\Support\Geo;

class DemLeguiPricingService
{
    const BASE_FARE_KEY = 'dem_legui_base_fare';

    const FARE_PER_KM_KEY = 'dem_legui_fare_per_km';

    const DEFAULT_BASE_FARE = '300';

    const DEFAULT_FARE_PER_KM = '150';

    public function __construct(private readonly PlatformSettingsService $settings) {}

    /**
     * @return array{distance_km: float, fare_per_seat: int, fare_total: int}
     */
    public function quote(float $pickupLat, float $pickupLng, City $destination, int $seats): array
    {
        $distanceKm = $destination->latitude !== null
            ? Geo::haversineKm($pickupLat, $pickupLng, (float) $destination->latitude, (float) $destination->longitude)
            : 0.0;

        $farePerSeat = (int) round($this->baseFare() + $distanceKm * $this->farePerKm());

        return [
            'distance_km' => round($distanceKm, 2),
            'fare_per_seat' => $farePerSeat,
            'fare_total' => $farePerSeat * $seats,
        ];
    }

    public function baseFare(): float
    {
        return (float) $this->settings->get(self::BASE_FARE_KEY, self::DEFAULT_BASE_FARE);
    }

    public function farePerKm(): float
    {
        return (float) $this->settings->get(self::FARE_PER_KM_KEY, self::DEFAULT_FARE_PER_KM);
    }
}
