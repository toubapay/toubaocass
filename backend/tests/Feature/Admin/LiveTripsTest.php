<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\AnandoRide;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiTrip;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveTripsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_trip_with_a_live_ping_is_flagged_live_and_uses_the_ping_not_the_departure_point(): void
    {
        $admin = AdminUser::factory()->create();
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_IN_PROGRESS,
            'departure_latitude' => 14.60,
            'departure_longitude' => -17.40,
            'current_latitude' => 14.72,
            'current_longitude' => -17.46,
            'current_location_updated_at' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips/live')->assertOk();

        $entry = collect($response->json('data'))->firstWhere('id', $trip->id);
        $this->assertSame('trip', $entry['type']);
        $this->assertTrue($entry['is_live']);
        $this->assertEquals(14.72, $entry['latitude']);
        $this->assertEquals(-17.46, $entry['longitude']);
    }

    public function test_a_trip_without_a_ping_yet_falls_back_to_departure_point_and_is_not_flagged_live(): void
    {
        $admin = AdminUser::factory()->create();
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_IN_PROGRESS,
            'departure_latitude' => 14.60,
            'departure_longitude' => -17.40,
            'current_latitude' => null,
            'current_longitude' => null,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips/live')->assertOk();

        $entry = collect($response->json('data'))->firstWhere('id', $trip->id);
        $this->assertFalse($entry['is_live']);
        $this->assertEquals(14.60, $entry['latitude']);
        $this->assertEquals(-17.40, $entry['longitude']);
    }

    public function test_an_anando_ride_in_progress_with_a_ping_is_included(): void
    {
        $admin = AdminUser::factory()->create();
        $poster = User::factory()->create(['name' => 'Awa Ndiaye', 'phone' => '+221770001122']);
        $ride = AnandoRide::factory()->create([
            'user_id' => $poster->id,
            'status' => AnandoRide::STATUS_IN_PROGRESS,
            'current_latitude' => 14.70,
            'current_longitude' => -17.45,
            'current_location_updated_at' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips/live')->assertOk();

        $entry = collect($response->json('data'))->first(fn ($e) => $e['type'] === 'anando' && $e['id'] === $ride->id);
        $this->assertNotNull($entry);
        $this->assertTrue($entry['is_live']);
        $this->assertSame('Awa Ndiaye', $entry['driver_name']);
        $this->assertSame('+221770001122', $entry['driver_phone']);
        $this->assertNull($entry['car']);
    }

    public function test_an_anando_ride_without_a_ping_is_excluded(): void
    {
        $admin = AdminUser::factory()->create();
        AnandoRide::factory()->create([
            'status' => AnandoRide::STATUS_IN_PROGRESS,
            'current_latitude' => null,
            'current_longitude' => null,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips/live')->assertOk();

        $this->assertCount(0, collect($response->json('data'))->where('type', 'anando'));
    }

    public function test_a_dem_legui_trip_in_progress_with_a_ping_is_included(): void
    {
        $admin = AdminUser::factory()->create();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $destination = City::factory()->create();

        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => $destination->id,
            'total_seats' => 4,
            'available_seats' => 3,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_IN_PROGRESS,
            'current_latitude' => 14.68,
            'current_longitude' => -17.44,
            'current_location_updated_at' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips/live')->assertOk();

        $entry = collect($response->json('data'))->first(fn ($e) => $e['type'] === 'dem_legui' && $e['id'] === $trip->id);
        $this->assertNotNull($entry);
        $this->assertTrue($entry['is_live']);
        $this->assertSame($destination->name, $entry['destination_city']);
    }

    public function test_completed_and_scheduled_rides_of_every_type_are_excluded(): void
    {
        $admin = AdminUser::factory()->create();
        Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);
        Trip::factory()->create(['status' => Trip::STATUS_COMPLETED]);
        AnandoRide::factory()->create(['status' => AnandoRide::STATUS_OPEN]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips/live')->assertOk();

        $this->assertCount(0, $response->json('data'));
    }
}
