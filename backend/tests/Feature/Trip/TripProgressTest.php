<?php

namespace Tests\Feature\Trip;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Trip;
use App\Models\User;
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
            ->assertJsonPath('started_at', fn ($value) => $value !== null);

        $this->assertNotNull($trip->fresh()->started_at);
    }

    public function test_in_progress_trip_exposes_progress_and_distance_covered_to_the_rider(): void
    {
        $origin = City::factory()->create(['latitude' => 14.0, 'longitude' => -17.0]);
        $destination = City::factory()->create(['latitude' => 14.0, 'longitude' => -16.0]);
        $car = Car::factory()->create();

        $trip = Trip::factory()->create([
            'driver_id' => $car->driver_id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_IN_PROGRESS,
            'started_at' => now()->subMinutes(20),
            // Halfway between origin and destination along the same latitude.
            'current_latitude' => 14.0,
            'current_longitude' => -16.5,
        ]);

        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson("/api/trips/{$trip->id}")
            ->assertOk();

        $this->assertNotNull($response->json('started_at'));
        $percent = $response->json('progress_percent');
        $this->assertNotNull($percent);
        $this->assertGreaterThan(45, $percent);
        $this->assertLessThan(55, $percent);

        $distanceCovered = $response->json('distance_covered_km');
        $routeDistance = $response->json('route_distance_km');
        $this->assertNotNull($distanceCovered);
        $this->assertGreaterThan($routeDistance * 0.45, $distanceCovered);
        $this->assertLessThan($routeDistance * 0.55, $distanceCovered);
    }

    public function test_a_scheduled_trip_has_no_progress(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'current_latitude' => 14.0,
            'current_longitude' => -16.5,
        ]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $response = $this->actingAs($rider, 'sanctum')->getJson("/api/trips/{$trip->id}")->assertOk();

        $this->assertNull($response->json('progress_percent'));
        $this->assertNull($response->json('distance_covered_km'));
    }

    public function test_my_active_trip_returns_the_riders_in_progress_booked_trip(): void
    {
        $rider = User::factory()->create();

        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS, 'started_at' => now()]);
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        // A different rider's in-progress trip must not show up.
        $otherTrip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS, 'started_at' => now()]);
        Booking::factory()->create(['trip_id' => $otherTrip->id, 'rider_id' => User::factory()->create()->id, 'status' => Booking::STATUS_CONFIRMED]);

        // A scheduled trip the rider booked must not show up either.
        $scheduledTrip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);
        Booking::factory()->create(['trip_id' => $scheduledTrip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/trips/mine/active')->assertOk();

        $response->assertJsonPath('data.id', $trip->id);
    }

    public function test_my_active_trip_is_null_when_the_rider_has_no_in_progress_trip(): void
    {
        $rider = User::factory()->create();

        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/trips/mine/active')->assertOk();

        $response->assertJsonPath('data', null);
    }
}
