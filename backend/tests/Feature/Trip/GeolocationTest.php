<?php

namespace Tests\Feature\Trip;

use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeolocationTest extends TestCase
{
    use RefreshDatabase;

    // Dakar city center, used as the rider's "current location" in these tests.
    private const RIDER_LAT = 14.6928;

    private const RIDER_LNG = -17.4467;

    private function makeApprovedDriver(): User
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);

        return $driver;
    }

    public function test_driver_can_post_a_trip_with_a_departure_pin(): void
    {
        $driver = $this->makeApprovedDriver();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        [$origin, $destination] = City::factory()->count(2)->create();

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trips', [
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
            'fare' => 5000,
            'ride_type' => 'standard',
            'departure_latitude' => self::RIDER_LAT,
            'departure_longitude' => self::RIDER_LNG,
            'departure_address' => 'Place de l\'Indépendance, Dakar',
        ])->assertCreated();

        $response->assertJsonPath('departure_latitude', self::RIDER_LAT)
            ->assertJsonPath('departure_longitude', self::RIDER_LNG)
            ->assertJsonPath('departure_address', 'Place de l\'Indépendance, Dakar');

        $this->assertDatabaseHas('trips', [
            'departure_address' => 'Place de l\'Indépendance, Dakar',
        ]);
    }

    public function test_posting_a_trip_without_a_departure_pin_still_works(): void
    {
        $driver = $this->makeApprovedDriver();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        [$origin, $destination] = City::factory()->count(2)->create();

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trips', [
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
            'fare' => 5000,
            'ride_type' => 'standard',
        ])->assertCreated();

        $response->assertJsonPath('departure_latitude', null)
            ->assertJsonPath('departure_longitude', null);
    }

    public function test_departure_latitude_requires_longitude_and_vice_versa(): void
    {
        $driver = $this->makeApprovedDriver();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        [$origin, $destination] = City::factory()->count(2)->create();

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trips', [
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
            'fare' => 5000,
            'ride_type' => 'standard',
            'departure_latitude' => self::RIDER_LAT,
        ])->assertUnprocessable()->assertJsonValidationErrors('departure_longitude');
    }

    private function tripNear(float $lat, float $lng, ?string $address = 'Somewhere'): Trip
    {
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => 4]);
        [$origin, $destination] = City::factory()->count(2)->create();

        return Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'departure_latitude' => $lat,
            'departure_longitude' => $lng,
            'departure_address' => $address,
        ]);
    }

    public function test_rider_can_search_for_nearby_departures_ordered_by_distance(): void
    {
        $rider = User::factory()->create();

        $atRider = $this->tripNear(self::RIDER_LAT, self::RIDER_LNG);
        // ~5km north.
        $nearby = $this->tripNear(self::RIDER_LAT + 0.045, self::RIDER_LNG);
        // ~200km away — outside the default 50km radius.
        $far = $this->tripNear(self::RIDER_LAT + 1.8, self::RIDER_LNG);
        // No departure pin at all — must never surface in a geo search.
        $noPin = $this->tripNear(self::RIDER_LAT, self::RIDER_LNG);
        $noPin->update(['departure_latitude' => null, 'departure_longitude' => null]);

        $response = $this->actingAs($rider, 'sanctum')->getJson(
            '/api/trips?lat='.self::RIDER_LAT.'&lng='.self::RIDER_LNG
        )->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame([$atRider->id, $nearby->id], $ids);

        $distances = collect($response->json('data'))->pluck('distance_km', 'id');
        $this->assertLessThan(1, $distances[$atRider->id]);
        $this->assertEqualsWithDelta(5, $distances[$nearby->id], 1.5);
    }

    public function test_wider_radius_includes_farther_trips(): void
    {
        $rider = User::factory()->create();

        $atRider = $this->tripNear(self::RIDER_LAT, self::RIDER_LNG);
        $far = $this->tripNear(self::RIDER_LAT + 1.8, self::RIDER_LNG);

        $response = $this->actingAs($rider, 'sanctum')->getJson(
            '/api/trips?lat='.self::RIDER_LAT.'&lng='.self::RIDER_LNG.'&radius_km=300'
        )->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame([$atRider->id, $far->id], $ids);
    }

    public function test_search_without_coordinates_still_returns_trips_lacking_a_pin(): void
    {
        $rider = User::factory()->create();
        $trip = $this->tripNear(self::RIDER_LAT, self::RIDER_LNG);
        $trip->update(['departure_latitude' => null, 'departure_longitude' => null]);

        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/trips')->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($trip->id, $ids);
    }
}
