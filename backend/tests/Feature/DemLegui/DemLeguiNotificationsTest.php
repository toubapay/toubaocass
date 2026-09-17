<?php

namespace Tests\Feature\DemLegui;

use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\DriverProfile;
use App\Models\User;
use App\Notifications\DemLeguiDriverArrivedNotification;
use App\Notifications\DemLeguiRequestAcceptedNotification;
use App\Notifications\DemLeguiRequestCancelledNotification;
use App\Notifications\DemLeguiRequestMatchedNotification;
use App\Notifications\DemLeguiTripCompletedNotification;
use App\Notifications\DemLeguiTripStartedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DemLeguiNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function onlineDriver(): User
    {
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create([
            'user_id' => $driver->id,
            'is_online' => true,
            'current_latitude' => 14.69,
            'current_longitude' => -17.44,
        ]);
        Car::factory()->create(['driver_id' => $driver->id, 'is_active' => true, 'seats' => 4]);

        return $driver;
    }

    private function matchedRequest(): array
    {
        // DemLeguiRequestMatchedNotification (existing, rider-facing) is
        // gated on the rider already having an fcm_token — unrelated to
        // this test file's own notifications, but needed for the
        // assertSentTo assertion on it to pass.
        $rider = User::factory()->create(['fcm_token' => 'test-token']);
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $driver = $this->onlineDriver();
        $car = Car::where('driver_id', $driver->id)->first();

        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $tripId = $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/requests/{$request->id}/accept", ['car_id' => $car->id])
            ->json('id');

        return [$request->fresh(), $driver, $rider, DemLeguiTrip::find($tripId)];
    }

    public function test_accepting_a_request_notifies_both_the_rider_and_the_driver(): void
    {
        Notification::fake();
        [, $driver, $rider] = $this->matchedRequest();

        Notification::assertSentTo($rider, DemLeguiRequestMatchedNotification::class);
        Notification::assertSentTo($driver, DemLeguiRequestAcceptedNotification::class);
    }

    public function test_cancelling_a_matched_request_notifies_the_driver(): void
    {
        [$request, $driver] = $this->matchedRequest();
        Notification::fake();

        $this->actingAs($request->rider, 'sanctum')
            ->deleteJson("/api/dem-legui/requests/{$request->id}")
            ->assertOk();

        Notification::assertSentTo($driver, DemLeguiRequestCancelledNotification::class);
    }

    public function test_cancelling_a_pending_unmatched_request_notifies_nobody(): void
    {
        Notification::fake();
        $rider = User::factory()->create();
        $destination = City::factory()->create(['latitude' => 14.85, 'longitude' => -17.06]);
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'destination_city_id' => $destination->id]);

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/dem-legui/requests/{$request->id}")
            ->assertOk();

        Notification::assertNothingSent();
    }

    public function test_driver_arriving_at_pickup_notifies_the_rider(): void
    {
        [, $driver, $rider, $trip] = $this->matchedRequest();
        Notification::fake();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$trip->id}/arrived")
            ->assertOk();

        Notification::assertSentTo($rider, DemLeguiDriverArrivedNotification::class);
    }

    public function test_starting_the_trip_notifies_the_rider(): void
    {
        [, $driver, $rider, $trip] = $this->matchedRequest();
        Notification::fake();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$trip->id}/start")
            ->assertOk();

        Notification::assertSentTo($rider, DemLeguiTripStartedNotification::class);
    }

    public function test_completing_the_trip_notifies_the_rider(): void
    {
        [, $driver, $rider, $trip] = $this->matchedRequest();

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/dem-legui/trips/{$trip->id}/start")->assertOk();
        Notification::fake();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/dem-legui/trips/{$trip->id}/complete")
            ->assertOk();

        Notification::assertSentTo($rider, DemLeguiTripCompletedNotification::class);
    }
}
