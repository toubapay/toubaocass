<?php

namespace Tests\Feature\Driver;

use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CarAndTripTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_can_add_a_car(): void
    {
        $driver = User::factory()->driver()->create();

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/cars', [
            'type' => 'sedan',
            'make' => 'Toyota',
            'model' => 'Corolla',
            'plate_number' => 'DK-1234-AB',
            'seats' => 4,
        ])->assertCreated();

        $this->assertDatabaseHas('cars', ['plate_number' => 'DK-1234-AB', 'driver_id' => $driver->id]);
        $response->assertJsonPath('seats', 4);
    }

    public function test_rider_cannot_add_a_car(): void
    {
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')->postJson('/api/driver/cars', [
            'type' => 'sedan', 'make' => 'Toyota', 'model' => 'Corolla',
            'plate_number' => 'DK-9999-ZZ', 'seats' => 4,
        ])->assertForbidden();
    }

    public function test_driver_must_have_approved_kyc_to_post_a_trip(): void
    {
        Storage::fake('public');

        $driver = User::factory()->driver()->create();
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
        ])->assertUnprocessable();

        // Approve KYC then retry with a fresh model instance (the guard
        // caches the previously-resolved user's empty driverProfile relation).
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);

        $this->actingAs($driver->fresh(), 'sanctum')->postJson('/api/driver/trips', [
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
            'fare' => 5000,
            'ride_type' => 'standard',
        ])->assertCreated()->assertJsonPath('available_seats', 4);
    }

    public function test_driver_can_submit_kyc_documents(): void
    {
        Storage::fake('public');

        $driver = User::factory()->driver()->create();

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/kyc', [
            'license_number' => 'LIC-001',
            'license_expiry' => now()->addYear()->toDateString(),
            'national_id_number' => '1234567890123',
            'id_document' => UploadedFile::fake()->image('id.jpg'),
            'license_document' => UploadedFile::fake()->image('license.jpg'),
            'selfie' => UploadedFile::fake()->image('selfie.jpg'),
        ])->assertCreated()->assertJsonPath('kyc_status', 'submitted');

        $this->assertDatabaseHas('driver_profiles', ['user_id' => $driver->id, 'kyc_status' => 'submitted']);
    }
}
