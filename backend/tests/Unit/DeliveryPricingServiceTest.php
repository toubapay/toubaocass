<?php

namespace Tests\Unit;

use App\Services\DeliveryPricingService;
use App\Support\Geo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryPricingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_quote_matches_haversine_distance_and_configured_rate(): void
    {
        config(['services.delivery.fee_per_km' => 100, 'services.delivery.base_fee' => 300]);

        $pickupLat = 14.72;
        $pickupLng = -17.46;
        $dropLat = 14.68;
        $dropLng = -17.44;

        $quote = app(DeliveryPricingService::class)->quote($pickupLat, $pickupLng, $dropLat, $dropLng);

        $expectedDistance = round(Geo::haversineKm($pickupLat, $pickupLng, $dropLat, $dropLng), 2);
        $expectedFee = (int) round(300 + $expectedDistance * 100);

        $this->assertSame($expectedDistance, $quote['distance_km']);
        $this->assertSame($expectedFee, $quote['fee']);
    }

    public function test_zero_distance_still_charges_the_base_fee(): void
    {
        config(['services.delivery.fee_per_km' => 150, 'services.delivery.base_fee' => 500]);

        $quote = app(DeliveryPricingService::class)->quote(14.72, -17.46, 14.72, -17.46);

        $this->assertSame(0.0, $quote['distance_km']);
        $this->assertSame(500, $quote['fee']);
    }
}
