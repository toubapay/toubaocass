<?php

namespace Tests\Feature\Trip;

use App\Models\Booking;
use App\Models\City;
use App\Models\Trip;
use App\Models\User;
use App\Support\Geo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_starting_a_trip_records_started_at(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);

        $this->assertNull($trip->started_at);

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/start")
            ->assertOk()
            ->assertJsonPath('status', 'in_progress');

        $trip->refresh();
        $this->assertNotNull($trip->started_at);
        $this->assertTrue($trip->started_at->greaterThan(now()->subMinute()));
    }

    public function test_distance_traveled_is_computed_from_the_departure_pin_to_the_current_position(): void
    {
        // Dakar city center to a point ~10.6km away (via App\Support\Geo::haversineKm).
        $departureLat = 14.6928;
        $departureLng = -17.4467;
        $currentLat = 14.7645;
        $currentLng = -17.3660;
        $expectedKm = round(Geo::haversineKm($departureLat, $departureLng, $currentLat, $currentLng), 1);

        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_IN_PROGRESS,
            'departure_latitude' => $departureLat,
            'departure_longitude' => $departureLng,
            'current_latitude' => $currentLat,
            'current_longitude' => $currentLng,
            'current_location_updated_at' => now(),
        ]);
        $rider = User::factory()->create();
        Booking::factory()->for($trip)->for($rider, 'rider')->create(['status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->getJson("/api/trips/{$trip->id}")
            ->assertOk()
            ->assertJsonPath('distance_traveled_km', $expectedKm);
    }

    public function test_distance_traveled_falls_back_to_the_origin_city_when_no_departure_pin_was_dropped(): void
    {
        $originCity = City::factory()->create(['latitude' => 14.6928, 'longitude' => -17.4467]);
        $currentLat = 14.7645;
        $currentLng = -17.3660;
        $expectedKm = round(Geo::haversineKm(14.6928, -17.4467, $currentLat, $currentLng), 1);

        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_IN_PROGRESS,
            'origin_city_id' => $originCity->id,
            'departure_latitude' => null,
            'departure_longitude' => null,
            'current_latitude' => $currentLat,
            'current_longitude' => $currentLng,
            'current_location_updated_at' => now(),
        ]);
        $rider = User::factory()->create();
        Booking::factory()->for($trip)->for($rider, 'rider')->create(['status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->getJson("/api/trips/{$trip->id}")
            ->assertOk()
            ->assertJsonPath('distance_traveled_km', $expectedKm);
    }

    public function test_distance_traveled_is_omitted_before_any_position_has_been_reported(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_IN_PROGRESS,
            'departure_latitude' => 14.6928,
            'departure_longitude' => -17.4467,
            'current_latitude' => null,
            'current_longitude' => null,
        ]);
        $rider = User::factory()->create();
        Booking::factory()->for($trip)->for($rider, 'rider')->create(['status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->getJson("/api/trips/{$trip->id}")
            ->assertOk()
            ->assertJsonMissingPath('distance_traveled_km');
    }
}
