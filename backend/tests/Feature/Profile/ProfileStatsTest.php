<?php

namespace Tests\Feature\Profile;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\Trip;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_stats_are_all_zero_or_null_for_a_fresh_rider(): void
    {
        $rider = User::factory()->create();

        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/profile/stats')->assertOk();

        $response->assertJson([
            'trips_count' => 0,
            'bookings_count' => 0,
            'anando_rides_count' => 0,
            'anando_clients_count' => 0,
            'earnings_total' => 0,
            'active_booking' => null,
            'last_trip' => null,
        ]);
    }

    public function test_rider_trips_and_bookings_counts_distinguish_completed_from_upcoming(): void
    {
        $rider = User::factory()->create();

        $upcomingTrip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);
        Booking::factory()->create(['rider_id' => $rider->id, 'trip_id' => $upcomingTrip->id, 'status' => Booking::STATUS_CONFIRMED]);

        $completedTripA = Trip::factory()->create(['status' => Trip::STATUS_COMPLETED, 'departure_date' => '2024-01-10']);
        Booking::factory()->create(['rider_id' => $rider->id, 'trip_id' => $completedTripA->id, 'status' => Booking::STATUS_CONFIRMED]);

        $completedTripB = Trip::factory()->create(['status' => Trip::STATUS_COMPLETED, 'departure_date' => '2024-03-05']);
        Booking::factory()->create(['rider_id' => $rider->id, 'trip_id' => $completedTripB->id, 'status' => Booking::STATUS_CONFIRMED]);

        $cancelledTrip = Trip::factory()->create(['status' => Trip::STATUS_COMPLETED]);
        Booking::factory()->create(['rider_id' => $rider->id, 'trip_id' => $cancelledTrip->id, 'status' => Booking::STATUS_CANCELLED]);

        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/profile/stats')->assertOk();

        // 2 completed trips actually taken, but 3 confirmed bookings made overall.
        $this->assertEquals(2, $response->json('trips_count'));
        $this->assertEquals(3, $response->json('bookings_count'));

        $this->assertEquals($completedTripB->id, $response->json('last_trip.id'));
        $this->assertEquals($upcomingTrip->id, $response->json('active_booking.id'));
    }

    public function test_driver_trips_and_bookings_counts(): void
    {
        $driver = User::factory()->driver()->create();

        $tripA = Trip::factory()->create(['driver_id' => $driver->id, 'status' => Trip::STATUS_COMPLETED, 'departure_date' => '2024-01-01']);
        Booking::factory()->count(2)->create(['trip_id' => $tripA->id, 'status' => Booking::STATUS_CONFIRMED]);
        Booking::factory()->create(['trip_id' => $tripA->id, 'status' => Booking::STATUS_CANCELLED]);

        $tripB = Trip::factory()->create(['driver_id' => $driver->id, 'status' => Trip::STATUS_SCHEDULED]);
        Booking::factory()->create(['trip_id' => $tripB->id, 'status' => Booking::STATUS_CONFIRMED]);

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/profile/stats')->assertOk();

        $this->assertEquals(2, $response->json('trips_count'));
        $this->assertEquals(3, $response->json('bookings_count'));
        $this->assertEquals($tripA->id, $response->json('last_trip.id'));
        $this->assertEquals($tripB->id, $response->json('active_booking.id'));
    }

    public function test_anando_rides_and_clients_counts(): void
    {
        $poster = User::factory()->create();
        $rideA = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_OPEN]);
        $rideB = AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_COMPLETED]);
        AnandoRide::factory()->create(['user_id' => $poster->id, 'status' => AnandoRide::STATUS_CANCELLED]);

        AnandoRideBooking::factory()->create(['anando_ride_id' => $rideA->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);
        AnandoRideBooking::factory()->create(['anando_ride_id' => $rideB->id, 'status' => AnandoRideBooking::STATUS_CONFIRMED]);
        AnandoRideBooking::factory()->create(['anando_ride_id' => $rideB->id, 'status' => AnandoRideBooking::STATUS_CANCELLED]);

        $response = $this->actingAs($poster, 'sanctum')->getJson('/api/profile/stats')->assertOk();

        $this->assertEquals(2, $response->json('anando_rides_count'));
        $this->assertEquals(2, $response->json('anando_clients_count'));
    }

    public function test_earnings_total_sums_only_earning_transactions(): void
    {
        $driver = User::factory()->driver()->create();
        $wallet = $driver->wallet()->create(['balance' => 0]);
        $wallet->transactions()->create(['type' => WalletTransaction::TYPE_EARNING, 'amount' => 3000]);
        $wallet->transactions()->create(['type' => WalletTransaction::TYPE_EARNING, 'amount' => 1500]);
        $wallet->transactions()->create(['type' => WalletTransaction::TYPE_TOP_UP, 'amount' => 10000]);

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/profile/stats')->assertOk();

        $this->assertEquals(4500, $response->json('earnings_total'));
    }

    public function test_stats_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/profile/stats')->assertUnauthorized();
    }
}
