<?php

namespace Tests\Feature\Rating;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Delivery;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PendingRatingTest extends TestCase
{
    use RefreshDatabase;

    private function driverWithProfile(): User
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'rating' => 5.00]);

        return $driver;
    }

    public function test_returns_null_when_rider_has_nothing_pending(): void
    {
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/me/pending-rating')
            ->assertOk()
            ->assertJson(['data' => null]);
    }

    public function test_returns_a_completed_unrated_trip(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
            'fare' => 2000,
        ]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'fare_total' => 4000, 'status' => Booking::STATUS_CONFIRMED]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/me/pending-rating')
            ->assertOk();

        $response->assertJsonPath('data.type', 'trip');
        $response->assertJsonPath('data.id', $trip->id);
        $response->assertJsonPath('data.driver.id', $driver->id);
        $response->assertJsonPath('data.cost', 4000);
        $response->assertJsonPath('data.origin_label', $origin->name);
        $response->assertJsonPath('data.destination_label', $destination->name);
    }

    public function test_rating_the_trip_makes_it_no_longer_pending(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
        ]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')->postJson("/api/trips/{$trip->id}/rate", ['score' => 5])->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/me/pending-rating')
            ->assertOk()
            ->assertJson(['data' => null]);
    }

    public function test_returns_a_delivered_unrated_delivery(): void
    {
        $driver = $this->driverWithProfile();
        $rider = User::factory()->create();
        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_DELIVERED,
            'fee' => 2500,
            'delivered_at' => now(),
        ]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/me/pending-rating')
            ->assertOk();

        $response->assertJsonPath('data.type', 'delivery');
        $response->assertJsonPath('data.id', $delivery->id);
        $response->assertJsonPath('data.cost', 2500);
    }

    public function test_returns_a_completed_unrated_dem_legui_trip(): void
    {
        $driver = $this->driverWithProfile();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $destination = City::factory()->create();
        $demLeguiTrip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => $destination->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats - 1,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);
        $rider = User::factory()->create();
        DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $demLeguiTrip->id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
            'fare_total' => 1500,
        ]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/me/pending-rating')
            ->assertOk();

        $response->assertJsonPath('data.type', 'dem_legui');
        $response->assertJsonPath('data.id', $demLeguiTrip->id);
        $response->assertJsonPath('data.cost', 1500);
    }

    public function test_picks_the_most_recently_completed_item_across_types(): void
    {
        $driver = $this->driverWithProfile();
        $rider = User::factory()->create();

        $olderDelivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_DELIVERED,
            'delivered_at' => now()->subHours(2),
        ]);

        $car = Car::factory()->create(['driver_id' => $driver->id]);
        [$origin, $destination] = City::factory()->count(2)->create();
        $newerTrip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            'status' => Trip::STATUS_COMPLETED,
            'updated_at' => now(),
        ]);
        Booking::factory()->create(['trip_id' => $newerTrip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson('/api/me/pending-rating')
            ->assertOk();

        $response->assertJsonPath('data.type', 'trip');
        $response->assertJsonPath('data.id', $newerTrip->id);
    }
}
