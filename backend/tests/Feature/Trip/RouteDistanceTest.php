<?php

namespace Tests\Feature\Trip;

use App\Models\Car;
use App\Models\City;
use App\Models\CityDistance;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use App\Services\Geo\CityDistanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RouteDistanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_haversine_fallback_computes_a_reasonable_distance_between_two_cities(): void
    {
        $dakar = City::factory()->create(['name' => 'Dakar', 'latitude' => 14.6928, 'longitude' => -17.4467]);
        $touba = City::factory()->create(['name' => 'Touba', 'latitude' => 14.8500, 'longitude' => -15.8833]);

        $distance = app(CityDistanceService::class)->between($dakar, $touba);

        $this->assertSame('haversine', $distance->source);
        // Dakar-Touba is roughly 160-170km as the crow flies.
        $this->assertEqualsWithDelta(165, $distance->distance_km, 15);
        $this->assertNotNull($distance->duration_minutes);
    }

    public function test_distance_is_cached_and_not_recomputed_on_a_second_lookup(): void
    {
        $dakar = City::factory()->create(['latitude' => 14.6928, 'longitude' => -17.4467]);
        $touba = City::factory()->create(['latitude' => 14.8500, 'longitude' => -15.8833]);

        $service = app(CityDistanceService::class);
        $first = $service->between($dakar, $touba);
        $second = $service->between($dakar, $touba);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, CityDistance::count());
    }

    public function test_cities_without_coordinates_yield_no_distance_instead_of_erroring(): void
    {
        $origin = City::factory()->create(['latitude' => null, 'longitude' => null]);
        $destination = City::factory()->create(['latitude' => null, 'longitude' => null]);

        $distance = app(CityDistanceService::class)->between($origin, $destination);

        $this->assertSame('unavailable', $distance->source);
        $this->assertNull($distance->distance_km);
    }

    public function test_trip_search_exposes_route_distance_and_duration(): void
    {
        $dakar = City::factory()->create(['latitude' => 14.6928, 'longitude' => -17.4467]);
        $touba = City::factory()->create(['latitude' => 14.8500, 'longitude' => -15.8833]);

        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);

        Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $touba->id,
            'destination_city_id' => $dakar->id,
        ]);

        $rider = User::factory()->create();
        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/trips')->assertOk();

        $trip = collect($response->json('data'))->first();
        $this->assertIsNumeric($trip['route_distance_km']);
        $this->assertGreaterThan(0, $trip['route_distance_km']);
        $this->assertIsNumeric($trip['route_duration_minutes']);
    }

    public function test_trip_detail_exposes_route_distance(): void
    {
        $dakar = City::factory()->create(['latitude' => 14.6928, 'longitude' => -17.4467]);
        $touba = City::factory()->create(['latitude' => 14.8500, 'longitude' => -15.8833]);

        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);

        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $touba->id,
            'destination_city_id' => $dakar->id,
        ]);

        $rider = User::factory()->create();
        $this->actingAs($rider, 'sanctum')->getJson("/api/trips/{$trip->id}")
            ->assertOk()
            ->assertJsonStructure(['route_distance_km', 'route_duration_minutes']);
    }
}
