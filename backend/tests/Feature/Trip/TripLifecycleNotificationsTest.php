<?php

namespace Tests\Feature\Trip;

use App\Models\Booking;
use App\Models\Trip;
use App\Models\User;
use App\Notifications\TripCompletedNotification;
use App\Notifications\TripDriverArrivedNotification;
use App\Notifications\TripStartedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class TripLifecycleNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function tripWithConfirmedRider(): array
    {
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);
        $rider = User::factory()->create();
        Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $rider->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        return [$trip, $rider];
    }

    public function test_starting_a_trip_notifies_confirmed_riders(): void
    {
        Notification::fake();
        [$trip, $rider] = $this->tripWithConfirmedRider();

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/start")
            ->assertOk();

        Notification::assertSentTo($rider, TripStartedNotification::class);
    }

    public function test_driver_arriving_notifies_confirmed_riders(): void
    {
        Notification::fake();
        [$trip, $rider] = $this->tripWithConfirmedRider();

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/arrived")
            ->assertOk();

        Notification::assertSentTo($rider, TripDriverArrivedNotification::class);
    }

    public function test_completing_a_trip_notifies_confirmed_riders(): void
    {
        Notification::fake();
        [$trip, $rider] = $this->tripWithConfirmedRider();

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/start")
            ->assertOk();

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/complete")
            ->assertOk();

        Notification::assertSentTo($rider, TripCompletedNotification::class);
    }

    public function test_cancelled_bookings_are_not_notified_of_lifecycle_events(): void
    {
        Notification::fake();
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);
        $rider = User::factory()->create();
        Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $rider->id,
            'status' => Booking::STATUS_CANCELLED,
        ]);

        $this->actingAs($trip->driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/start")
            ->assertOk();

        Notification::assertNotSentTo($rider, TripStartedNotification::class);
    }
}
