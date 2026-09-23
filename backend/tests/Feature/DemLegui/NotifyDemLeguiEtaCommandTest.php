<?php

namespace Tests\Feature\DemLegui;

use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\User;
use App\Notifications\DemLeguiEtaUpdateNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotifyDemLeguiEtaCommandTest extends TestCase
{
    use RefreshDatabase;

    private function openTripWithMatchedRider(array $riderOverrides = []): array
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create([
            'user_id' => $driver->id,
            'current_latitude' => 14.69,
            'current_longitude' => -17.44,
        ]);
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $destination = City::factory()->create();

        $trip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => $destination->id,
            'total_seats' => $car->seats,
            'available_seats' => $car->seats - 1,
            'price_per_seat' => 1000,
            'status' => DemLeguiTrip::STATUS_OPEN,
        ]);

        $rider = User::factory()->create(array_merge(['fcm_token' => 'test-token'], $riderOverrides));
        $request = DemLeguiRequest::factory()->create([
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $trip->id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
            'pickup_latitude' => 14.70,
            'pickup_longitude' => -17.45,
        ]);

        return [$trip, $request, $rider];
    }

    public function test_notifies_the_rider_of_a_matched_trip_still_en_route_to_pickup(): void
    {
        Notification::fake();
        [, $request, $rider] = $this->openTripWithMatchedRider();

        $this->artisan('dem-legui:notify-eta')->assertExitCode(0);

        Notification::assertSentTo($rider, DemLeguiEtaUpdateNotification::class);
    }

    public function test_does_not_notify_once_the_driver_has_arrived(): void
    {
        Notification::fake();
        [$trip, , $rider] = $this->openTripWithMatchedRider();
        $trip->update(['arrived_at' => now()]);

        $this->artisan('dem-legui:notify-eta');

        Notification::assertNotSentTo($rider, DemLeguiEtaUpdateNotification::class);
    }

    public function test_does_not_notify_for_a_completed_or_cancelled_trip(): void
    {
        Notification::fake();
        [$trip, , $rider] = $this->openTripWithMatchedRider();
        $trip->update(['status' => DemLeguiTrip::STATUS_IN_PROGRESS]);

        $this->artisan('dem-legui:notify-eta');

        Notification::assertNotSentTo($rider, DemLeguiEtaUpdateNotification::class);
    }

    public function test_notifies_each_matched_rider_on_a_shared_trip_separately(): void
    {
        Notification::fake();
        [$trip, , $riderA] = $this->openTripWithMatchedRider();

        $riderB = User::factory()->create(['fcm_token' => 'test-token-2']);
        DemLeguiRequest::factory()->create([
            'rider_id' => $riderB->id,
            'dem_legui_trip_id' => $trip->id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
            'pickup_latitude' => 14.71,
            'pickup_longitude' => -17.46,
        ]);

        $this->artisan('dem-legui:notify-eta');

        Notification::assertSentTo($riderA, DemLeguiEtaUpdateNotification::class);
        Notification::assertSentTo($riderB, DemLeguiEtaUpdateNotification::class);
    }
}
