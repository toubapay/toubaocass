<?php

namespace Tests\Feature\Trip;

use App\Models\Car;
use App\Models\City;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use App\Notifications\InstantTripPostedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class InstantTripTest extends TestCase
{
    use RefreshDatabase;

    private function approvedDriverWithCar(int $seats = 4): array
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        $car = Car::factory()->create(['driver_id' => $driver->id, 'seats' => $seats]);

        return [$driver->fresh(), $car];
    }

    public function test_driver_can_post_an_instant_trip_without_a_date_or_time(): void
    {
        Notification::fake();

        [$driver, $car] = $this->approvedDriverWithCar();
        [$origin, $destination] = City::factory()->count(2)->create();

        $response = $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trips/instant', [
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'fare' => 3000,
            'ride_type' => 'standard',
        ])->assertCreated();

        $response->assertJsonPath('is_instant', true);
        $response->assertJsonPath('status', 'scheduled');
        $response->assertJsonPath('available_seats', 4);

        $this->assertDatabaseHas('trips', ['id' => $response->json('id'), 'is_instant' => true]);
    }

    public function test_posting_an_instant_trip_notifies_riders_with_a_registered_fcm_token(): void
    {
        Notification::fake();

        [$driver, $car] = $this->approvedDriverWithCar();
        [$origin, $destination] = City::factory()->count(2)->create();

        $riderWithToken = User::factory()->create(['fcm_token' => 'token-abc']);
        User::factory()->create(['fcm_token' => null]);

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trips/instant', [
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'fare' => 3000,
            'ride_type' => 'standard',
        ])->assertCreated();

        Notification::assertSentTo($riderWithToken, InstantTripPostedNotification::class);
    }

    public function test_driver_must_have_approved_kyc_to_post_an_instant_trip(): void
    {
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/trips/instant', [
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'fare' => 3000,
            'ride_type' => 'standard',
        ])->assertUnprocessable();
    }

    public function test_instant_index_only_returns_active_instant_trips(): void
    {
        [$driver, $car] = $this->approvedDriverWithCar();
        [$origin, $destination] = City::factory()->count(2)->create();

        $instant = Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'is_instant' => true, 'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->toDateString(), 'departure_time' => now()->addMinutes(15)->format('H:i'),
        ]);

        // A regular (non-instant) scheduled trip.
        Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'is_instant' => false,
        ]);

        // An instant trip whose grace window has already elapsed.
        Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'is_instant' => true, 'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->subHour()->toDateString(), 'departure_time' => now()->subHour()->format('H:i'),
        ]);

        // A full instant trip (no seats left).
        Trip::factory()->create([
            'driver_id' => $driver->id, 'car_id' => $car->id,
            'origin_city_id' => $origin->id, 'destination_city_id' => $destination->id,
            'is_instant' => true, 'status' => Trip::STATUS_FULL, 'available_seats' => 0,
            'departure_date' => now()->toDateString(), 'departure_time' => now()->addMinutes(15)->format('H:i'),
        ]);

        $rider = User::factory()->create();

        // Not paginated (get(), not paginate()), so — like every other
        // non-paginated collection endpoint in this app — the response is
        // the plain array itself, not wrapped in a "data" key.
        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/trips/instant')
            ->assertOk();

        $ids = collect($response->json())->pluck('id')->all();

        $this->assertEquals([$instant->id], $ids);
    }
}
