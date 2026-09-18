<?php

namespace Tests\Feature\Chat;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\Delivery;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InboxTest extends TestCase
{
    use RefreshDatabase;

    public function test_inbox_is_empty_for_a_user_with_no_threads(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/inbox')->assertOk();

        $this->assertSame([], $response->json('data'));
        $this->assertSame(0, $response->json('unread_total'));
    }

    public function test_a_booking_thread_with_no_messages_is_not_listed(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create(['driver_id' => $driver->id]);
        $rider = User::factory()->create();
        Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id]);

        $response = $this->actingAs($rider, 'sanctum')->getJson('/api/inbox')->assertOk();

        $this->assertSame([], $response->json('data'));
    }

    public function test_booking_thread_shows_unread_count_for_the_recipient_only(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create(['driver_id' => $driver->id]);
        $rider = User::factory()->create();
        $booking = Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id]);

        $this->actingAs($rider, 'sanctum')->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'Bonjour'])->assertCreated();

        $driverInbox = $this->actingAs($driver, 'sanctum')->getJson('/api/inbox')->assertOk();
        $this->assertSame(1, $driverInbox->json('data.0.unread_count'));
        $this->assertSame(1, $driverInbox->json('unread_total'));
        $this->assertSame('booking', $driverInbox->json('data.0.type'));
        $this->assertSame($booking->id, $driverInbox->json('data.0.id'));
        $this->assertSame($rider->name, $driverInbox->json('data.0.other_party_name'));

        $riderInbox = $this->actingAs($rider, 'sanctum')->getJson('/api/inbox')->assertOk();
        $this->assertSame(0, $riderInbox->json('data.0.unread_count'));
        $this->assertSame($driver->name, $riderInbox->json('data.0.other_party_name'));
    }

    public function test_reading_the_thread_clears_the_inbox_unread_count(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create(['driver_id' => $driver->id]);
        $rider = User::factory()->create();
        $booking = Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id]);

        $this->actingAs($rider, 'sanctum')->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'Bonjour']);
        $this->actingAs($driver, 'sanctum')->getJson("/api/bookings/{$booking->id}/messages")->assertOk();

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/inbox')->assertOk();
        $this->assertSame(0, $response->json('data.0.unread_count'));
        $this->assertSame(0, $response->json('unread_total'));
    }

    public function test_dem_legui_thread_is_listed(): void
    {
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $demLeguiTrip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => $car->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => 4,
            'available_seats' => 3,
            'price_per_seat' => 1000,
        ]);
        $rider = User::factory()->create();
        $request = DemLeguiRequest::factory()->create(['rider_id' => $rider->id, 'dem_legui_trip_id' => $demLeguiTrip->id]);

        $this->actingAs($rider, 'sanctum')->postJson("/api/dem-legui/requests/{$request->id}/messages", ['body' => 'Bonjour'])->assertCreated();

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/inbox')->assertOk();
        $this->assertSame('dem_legui_request', $response->json('data.0.type'));
        $this->assertSame(1, $response->json('data.0.unread_count'));
    }

    public function test_anando_thread_is_listed_for_both_poster_and_joiner(): void
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id]);
        $joiner = User::factory()->create();
        $booking = AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $joiner->id]);

        $this->actingAs($joiner, 'sanctum')->postJson("/api/anando-ride-bookings/{$booking->id}/messages", ['body' => 'Bonjour'])->assertCreated();

        $posterInbox = $this->actingAs($poster, 'sanctum')->getJson('/api/inbox')->assertOk();
        $this->assertSame('anando', $posterInbox->json('data.0.type'));
        $this->assertSame($joiner->name, $posterInbox->json('data.0.other_party_name'));

        $joinerInbox = $this->actingAs($joiner, 'sanctum')->getJson('/api/inbox')->assertOk();
        $this->assertSame($poster->name, $joinerInbox->json('data.0.other_party_name'));
    }

    public function test_delivery_thread_is_listed(): void
    {
        $sender = User::factory()->create();
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['sender_id' => $sender->id, 'driver_id' => $driver->id]);

        $this->actingAs($sender, 'sanctum')->postJson("/api/deliveries/{$delivery->id}/messages", ['body' => 'Bonjour'])->assertCreated();

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/inbox')->assertOk();
        $this->assertSame('delivery', $response->json('data.0.type'));
        $this->assertSame(1, $response->json('data.0.unread_count'));
    }

    public function test_threads_are_sorted_by_most_recent_message_first(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create(['driver_id' => $driver->id]);
        $riderA = User::factory()->create();
        $riderB = User::factory()->create();
        $bookingA = Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $riderA->id]);
        $bookingB = Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $riderB->id]);

        $this->actingAs($riderA, 'sanctum')->postJson("/api/bookings/{$bookingA->id}/messages", ['body' => 'Premier'])->assertCreated();
        $this->actingAs($riderB, 'sanctum')->postJson("/api/bookings/{$bookingB->id}/messages", ['body' => 'Second'])->assertCreated();

        $response = $this->actingAs($driver, 'sanctum')->getJson('/api/inbox')->assertOk();

        $this->assertSame($bookingB->id, $response->json('data.0.id'));
        $this->assertSame($bookingA->id, $response->json('data.1.id'));
        $this->assertSame(2, $response->json('unread_total'));
    }
}
