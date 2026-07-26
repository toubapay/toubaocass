<?php

namespace Tests\Feature\Trip;

use App\Models\Booking;
use App\Models\Trip;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinishStaleTripsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_scheduled_trip_more_than_a_day_past_departure_is_auto_completed_with_its_confirmed_bookings_left_intact(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->subDays(2)->toDateString(),
            'departure_time' => '08:00',
        ]);
        $rider = User::factory()->create();
        $booking = Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);

        $this->artisan('trips:finish-stale')->assertExitCode(0);

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'completed']);
        // The booking itself was never cancelled — it stays confirmed, same as
        // a normally-completed trip (TripController::complete() never touches
        // booking.status either).
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'confirmed']);
    }

    public function test_commission_is_applied_to_each_confirmed_booking(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->subDays(2)->toDateString(),
            'departure_time' => '08:00',
        ]);
        $booking = Booking::factory()->create(['trip_id' => $trip->id, 'status' => Booking::STATUS_CONFIRMED, 'fare_total' => 2000]);

        $this->artisan('trips:finish-stale');

        $booking->refresh();
        $this->assertSame('15.00', (string) $booking->commission_rate);
        $this->assertSame(300, $booking->commission_amount);
    }

    public function test_a_trip_only_a_few_hours_past_departure_is_left_alone(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->toDateString(),
            'departure_time' => now()->subHours(3)->format('H:i'),
        ]);

        $this->artisan('trips:finish-stale');

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => 'scheduled']);
    }

    public function test_an_upcoming_or_currently_departing_trip_is_left_alone(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_SCHEDULED,
            'departure_date' => now()->addDay()->toDateString(),
            'departure_time' => '08:00',
        ]);

        $this->artisan('trips:finish-stale');

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

            $this->artisan('trips:finish-stale');

            $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => $status]);
        }
    }

    public function test_wallet_paid_bookings_get_no_refund_since_the_ride_is_assumed_to_have_happened(): void
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

        $this->artisan('trips:finish-stale');

        // Balances are untouched — no refund, no reversal.
        $this->assertSame(0, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(7000, Wallet::where('user_id', $driver->id)->value('balance'));
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'confirmed']);
    }

    public function test_only_confirmed_bookings_get_commission_applied(): void
    {
        $trip = Trip::factory()->create([
            'status' => Trip::STATUS_FULL,
            'departure_date' => now()->subDays(2)->toDateString(),
            'departure_time' => '08:00',
        ]);
        $cancelledBooking = Booking::factory()->create(['trip_id' => $trip->id, 'status' => Booking::STATUS_CANCELLED]);

        $this->artisan('trips:finish-stale');

        $cancelledBooking->refresh();
        $this->assertNull($cancelledBooking->commission_rate);
        $this->assertDatabaseHas('bookings', ['id' => $cancelledBooking->id, 'status' => 'cancelled']);
    }
}
