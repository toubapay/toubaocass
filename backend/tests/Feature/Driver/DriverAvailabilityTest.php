<?php

namespace Tests\Feature\Driver;

use App\Models\Car;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DriverAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_approved_driver_with_active_car_can_go_online(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true]);

        $response = $this->actingAs($driver, 'sanctum')->putJson('/api/driver/availability', [
            'is_online' => true,
            'latitude' => 14.6928,
            'longitude' => -17.4467,
        ])->assertOk();

        $response->assertJsonPath('is_online', true);
        $this->assertDatabaseHas('driver_profiles', ['user_id' => $driver->id, 'is_online' => true]);
    }

    public function test_driver_can_go_offline(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'is_online' => true]);
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true]);

        $this->actingAs($driver, 'sanctum')->putJson('/api/driver/availability', [
            'is_online' => false,
        ])->assertOk()->assertJsonPath('is_online', false);

        $this->assertDatabaseHas('driver_profiles', ['user_id' => $driver->id, 'is_online' => false]);
    }

    public function test_driver_without_approved_kyc_cannot_go_online(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_SUBMITTED]);
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true]);

        $this->actingAs($driver, 'sanctum')->putJson('/api/driver/availability', [
            'is_online' => true,
            'latitude' => 14.6928,
            'longitude' => -17.4467,
        ])->assertStatus(422);

        $this->assertDatabaseHas('driver_profiles', ['user_id' => $driver->id, 'is_online' => false]);
    }

    public function test_driver_without_active_car_cannot_go_online(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);

        $this->actingAs($driver, 'sanctum')->putJson('/api/driver/availability', [
            'is_online' => true,
            'latitude' => 14.6928,
            'longitude' => -17.4467,
        ])->assertStatus(422);
    }

    public function test_going_online_requires_coordinates(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true]);

        $this->actingAs($driver, 'sanctum')->putJson('/api/driver/availability', [
            'is_online' => true,
        ])->assertStatus(422);
    }

    public function test_online_driver_can_update_location(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'is_online' => true]);

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/location', [
            'latitude' => 14.70,
            'longitude' => -17.40,
        ])->assertOk();

        $this->assertDatabaseHas('driver_profiles', [
            'user_id' => $driver->id,
            'current_latitude' => 14.70,
            'current_longitude' => -17.40,
        ]);
    }

    public function test_offline_driver_cannot_update_location(): void
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'is_online' => false]);

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/location', [
            'latitude' => 14.70,
            'longitude' => -17.40,
        ])->assertStatus(422);
    }

    public function test_rider_cannot_access_availability_endpoint(): void
    {
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')->putJson('/api/driver/availability', [
            'is_online' => true,
            'latitude' => 14.6928,
            'longitude' => -17.4467,
        ])->assertForbidden();
    }
}
