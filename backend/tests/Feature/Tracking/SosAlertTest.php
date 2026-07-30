<?php

namespace Tests\Feature\Tracking;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\Delivery;
use App\Models\SecurityAlert;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SosAlertTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_trips_confirmed_rider_can_raise_an_sos_alert(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/sos", ['latitude' => 14.7, 'longitude' => -17.4])
            ->assertOk();

        $this->assertDatabaseHas('security_alerts', [
            'type' => SecurityAlert::TYPE_RIDER_SOS,
            'severity' => SecurityAlert::SEVERITY_HIGH,
            'user_id' => $rider->id,
            'status' => SecurityAlert::STATUS_OPEN,
        ]);

        $alert = SecurityAlert::where('user_id', $rider->id)->firstOrFail();
        $this->assertSame('trip', $alert->metadata['kind']);
        $this->assertSame($trip->id, $alert->metadata['ride_id']);
        $this->assertSame(14.7, $alert->metadata['latitude']);
    }

    public function test_a_trips_driver_can_raise_an_sos_alert(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/sos")
            ->assertOk();
    }

    public function test_a_stranger_cannot_raise_a_trips_sos_alert(): void
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/trips/{$trip->id}/sos")
            ->assertNotFound();

        $this->assertDatabaseMissing('security_alerts', ['type' => SecurityAlert::TYPE_RIDER_SOS]);
    }

    public function test_an_anando_confirmed_joiner_can_raise_an_sos_alert(): void
    {
        $ride = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_IN_PROGRESS]);
        $joiner = User::factory()->create();
        AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $joiner->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);

        $this->actingAs($joiner, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/sos")
            ->assertOk();

        $this->assertDatabaseHas('security_alerts', [
            'type' => SecurityAlert::TYPE_RIDER_SOS,
            'user_id' => $joiner->id,
        ]);
    }

    public function test_a_stranger_cannot_raise_an_anando_sos_alert(): void
    {
        $ride = AnandoRide::factory()->create(['status' => AnandoRide::STATUS_IN_PROGRESS]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/anando-rides/{$ride->id}/sos")
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

    public function test_a_dem_legui_attached_rider_can_raise_an_sos_alert(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = $this->createDemLeguiTrip($driver, DemLeguiTrip::STATUS_IN_PROGRESS);
        $rider = User::factory()->create();
        DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'dem_legui_trip_id' => $trip->id, 'status' => DemLeguiRequest::STATUS_MATCHED]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/dem-legui/trips/{$trip->id}/sos")
            ->assertOk();

        $this->assertDatabaseHas('security_alerts', [
            'type' => SecurityAlert::TYPE_RIDER_SOS,
            'user_id' => $rider->id,
        ]);
    }

    public function test_a_stranger_cannot_raise_a_dem_legui_sos_alert(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = $this->createDemLeguiTrip($driver, DemLeguiTrip::STATUS_IN_PROGRESS);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/dem-legui/trips/{$trip->id}/sos")
            ->assertNotFound();
    }

    public function test_a_deliverys_sender_and_courier_can_raise_an_sos_alert(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_PICKED_UP]);

        $this->actingAs($delivery->sender, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/sos")
            ->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/sos")
            ->assertOk();

        $this->assertSame(2, SecurityAlert::where('type', SecurityAlert::TYPE_RIDER_SOS)
            ->where('metadata->ride_id', $delivery->id)
            ->count());
    }

    public function test_a_stranger_cannot_raise_a_deliverys_sos_alert(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_PICKED_UP]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/sos")
            ->assertNotFound();
    }
}
