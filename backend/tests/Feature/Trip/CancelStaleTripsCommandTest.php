<?php

namespace Tests\Feature\Trip;

use App\Models\Booking;
use App\Models\Trip;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Notifications\TripCancelledNotification;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CancelStaleTripsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_scheduled_trip_more_than_a_day_past_departure_is_auto_cancelled_with_its_confirmed_bookings(): void
    {
        Notification::fake();

        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->subDays(2)->toDateString(),
            'departure_time' => '08:00',
        ]);
        $rider = User::factory()->create();
        $booking = Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->artisan('trips:cancel-stale')->assertExitCode(0);

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled']);
        Notification::assertSentTo($rider, TripCancelledNotification::class);
    }

    public function test_a_trip_only_a_few_hours_past_departure_is_left_alone(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->subHours(3)->format('H:i'),
        ]);

        $this->artisan('trips:cancel-stale');

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'scheduled']);
    }

    public function test_an_upcoming_or_currently_departing_trip_is_left_alone(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
        ]);

        $this->artisan('trips:cancel-stale');

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'scheduled']);
    }

    public function test_in_progress_and_completed_and_already_cancelled_trips_are_left_alone(): void
    {
        foreach ([Trip::STATUS_IN_PROGRESS, Trip::STATUS_COMPLETED, Trip::STATUS_CANCELLED] as $status) {
            $trip = Trip::factory()->create([
                'status' => $status,
                'departure_date' => now()->subDays(3)->toDateString(),
                'departure_time' => '08:00',
            ]);

            $this->artisan('trips:cancel-stale');

            $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => $status]);
        }
    }

    public function test_wallet_paid_bookings_are_refunded_and_the_drivers_earning_is_reversed(): void
    {
        $driver = User::factory()->driver()->create();
        app(WalletService::class)->topUp($driver, 5000);

        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->subDays(2)->toDateString(),
            'departure_time' => '08:00',
        ]);

        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 2000);
        $booking = Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $rider->id,
            'status' => Booking::STATUS_CONFIRMED,
            'payment_method' => Booking::PAYMENT_METHOD_WALLET,
            'fare_total' => 2000,
        ]);
        // Simulate the fare having already been charged/earned at booking time.
        app(WalletService::class)->charge($rider, 2000, $booking, 'Paiement de réservation');
        app(WalletService::class)->credit($driver, 2000, $booking, WalletTransaction::TYPE_EARNING, 'Revenu de réservation');

        $this->artisan('trips:cancel-stale');

        $this->assertSame(2000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(5000, Wallet::where('user_id', $driver->id)->value('balance'));
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled']);
    }

    public function test_cash_bookings_get_no_wallet_movement_when_auto_cancelled(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create([
            'driver_id' => $driver->id,
            'status' => Trip::STATUS_FULL,
            'departure_date' => now()->subDays(2)->toDateString(),
            'departure_time' => '08:00',
        ]);
        $rider = User::factory()->create();
        $booking = Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $rider->id,
            'status' => Booking::STATUS_CONFIRMED,
            'payment_method' => Booking::PAYMENT_METHOD_CASH,
        ]);

        $this->artisan('trips:cancel-stale');

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled']);
        $this->assertDatabaseMissing('wallets', ['user_id' => $rider->id]);
    }

    public function test_a_cancelled_bookings_status_is_left_untouched(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->subDays(2)->toDateString(),
            'departure_time' => '08:00',
        ]);
        $booking = Booking::factory()->create(['trip_id' => $trip->id, 'status' => Booking::STATUS_CANCELLED]);

        $this->artisan('trips:cancel-stale');

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled']);
    }
}
