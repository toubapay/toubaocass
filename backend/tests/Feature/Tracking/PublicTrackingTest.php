<?php

namespace Tests\Feature\Tracking;

use App\Models\AnandoRide;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiTrip;
use App\Models\Delivery;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class PublicTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_valid_signature_returns_the_live_position_of_an_in_progress_trip(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_IN_PROGRESS,
            'current_latitude' => 14.7167,
            'current_longitude' => -17.4677,
        ]);

        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'trip', 'id' => $trip->id]);

        $response = $this->getJson($url)->assertOk();

        $response->assertJson([
            'trackable' => true,
            'person_name' => $trip->driver->name,
            'destination_city' => $trip->destinationCity->name,
            'current_latitude' => 14.7167,
            'current_longitude' => -17.4677,
        ]);
    }

    public function test_a_non_in_progress_ride_is_not_trackable(): void
    {
        $ride = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_OPEN]);

        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'anando', 'id' => $ride->id]);

        $this->getJson($url)->assertOk()->assertJson([
            'trackable' => false,
            'person_name' => null,
            'current_latitude' => null,
        ]);
    }

    public function test_an_unsigned_url_is_rejected(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $this->getJson("/api/track/trip/{$trip->id}")->assertForbidden();
    }

    public function test_a_tampered_signature_is_rejected(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);
        $otherTrip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'trip', 'id' => $trip->id]);
        $tampered = str_replace("track/trip/{$trip->id}", "track/trip/{$otherTrip->id}", $url);

        $this->getJson($tampered)->assertForbidden();
    }

    public function test_an_expired_signature_is_rejected(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $url = URL::temporarySignedRoute('public.track', now()->subHour(), ['type' => 'trip', 'id' => $trip->id]);

        $this->getJson($url)->assertForbidden();
    }

    public function test_an_unknown_type_returns_not_found(): void
    {
        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'bogus', 'id' => 1]);

        $this->getJson($url)->assertNotFound();
    }

    public function test_an_unknown_id_returns_not_found(): void
    {
        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'trip', 'id' => 999999]);

        $this->getJson($url)->assertNotFound();
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
            'current_latitude' => 14.6,
            'current_longitude' => -17.5,
        ]);
    }

    public function test_a_dem_legui_trip_has_no_origin_city_in_its_payload(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = $this->createDemLeguiTrip($driver, DemLeguiTrip::STATUS_IN_PROGRESS);

        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'dem-legui', 'id' => $trip->id]);

        $this->getJson($url)->assertOk()->assertJson([
            'trackable' => true,
            'person_name' => $driver->name,
            'origin_city' => null,
            'destination_city' => $trip->destinationCity->name,
        ]);
    }

    public function test_a_picked_up_delivery_is_trackable_with_address_lines_as_the_route(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create([
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_PICKED_UP,
            'current_latitude' => 14.68,
            'current_longitude' => -17.45,
        ]);

        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'delivery', 'id' => $delivery->id]);

        $this->getJson($url)->assertOk()->assertJson([
            'trackable' => true,
            'person_name' => $driver->name,
            'origin_city' => $delivery->pickup_address_line,
            'destination_city' => $delivery->receiver_address_line,
            'current_latitude' => 14.68,
            'current_longitude' => -17.45,
        ]);
    }

    public function test_a_delivery_not_yet_picked_up_is_not_trackable(): void
    {
        $delivery = Delivery::factory()->create(['status' => Delivery::STATUS_ACCEPTED]);

        $url = URL::temporarySignedRoute('public.track', now()->addHours(24), ['type' => 'delivery', 'id' => $delivery->id]);

        $this->getJson($url)->assertOk()->assertJson([
            'trackable' => false,
            'person_name' => null,
        ]);
    }
}
