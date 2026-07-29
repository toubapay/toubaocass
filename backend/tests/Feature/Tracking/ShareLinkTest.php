<?php

namespace Tests\Feature\Tracking;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShareLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_trips_driver_can_generate_a_share_link(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $response = $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/share-link")
            ->assertOk();

        $this->assertStringContainsString("/track/trip/{$trip->id}", $response->json('url'));
        $this->assertStringContainsString('signature=', $response->json('url'));
    }

    public function test_a_trips_confirmed_rider_can_generate_a_share_link(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/share-link")
            ->assertOk();
    }

    public function test_a_stranger_cannot_generate_a_trips_share_link(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/share-link")
            ->assertNotFound();
    }

    public function test_an_anando_posters_and_a_confirmed_joiners_can_generate_a_share_link(): void
    {
        $ride = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_IN_PROGRESS]);
        $joiner = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $joiner->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($ride->poster, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/share-link")
            ->assertOk();

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/share-link")
            ->assertOk();
    }

    public function test_a_stranger_cannot_generate_an_anando_share_link(): void
    {
        $ride = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_IN_PROGRESS]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/share-link")
            ->assertNotFound();
    }

    private function createDemLeguiTrip(User $driver, string $status): DemLeguiTrip
    {
        $car = Car::factory()->create(['driver_id' => $driver->id]);

        return DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats,
            'price_per_seat' => 1000,
            'status' => $status,
        ]);
    }

    public function test_a_dem_legui_trips_driver_and_attached_rider_can_generate_a_share_link(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = $this->createDemLeguiTrip($driver, DemLeguiTrip::STATUS_IN_PROGRESS);
        $rider = User::factory()->create();
        DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'dem_legui_trip_id' => $trip->id, 'status' => DemLeguiRequest::STATUS_MATCHED]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/dem-legui/trips/{$trip->id}/share-link")
            ->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/dem-legui/trips/{$trip->id}/share-link")
            ->assertOk();
    }

    public function test_a_stranger_cannot_generate_a_dem_legui_share_link(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = $this->createDemLeguiTrip($driver, DemLeguiTrip::STATUS_IN_PROGRESS);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/dem-legui/trips/{$trip->id}/share-link")
            ->assertNotFound();
    }
}
