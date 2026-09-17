<?php

namespace Tests\Feature\Driver;

use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActiveChatTest extends TestCase
{
    use RefreshDatabase;

    private function makeBooking(User $driver): Booking
    {
        $trip = Trip::factory()->create(['driver_id' => $driver->id]);

        return Booking::factory()->create(['trip_id' => $trip->id, 'status' => Booking::STATUS_CONFIRMED]);
    }

    private function makeDemLeguiRequest(User $driver): DemLeguiRequest
    {
        $demLeguiTrip = DemLeguiTrip::create([
            'driver_id' => $driver->id,
            'car_id' => Car::factory()->create(['driver_id' => $driver->id])->id,
            'destination_city_id' => City::factory()->create()->id,
            'total_seats' => 4,
            'available_seats' => 3,
            'price_per_seat' => 500,
            'status' => DemLeguiTrip::STATUS_OPEN,
        ]);

        return DemLeguiRequest::factory()->create([
            'dem_legui_trip_id' => $demLeguiTrip->id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
        ]);
    }

    public function test_no_active_chat_when_driver_has_nothing(): void
    {
        $driver = User::factory()->driver()->create();

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => null]);
    }

    public function test_falls_back_to_the_booking_when_nobody_has_messaged_yet(): void
    {
        $driver = User::factory()->driver()->create();
        $booking = $this->makeBooking($driver);

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => ['type' => 'booking', 'id' => $booking->id, 'latest_message_id' => null]]);
    }

    public function test_falls_back_to_the_dem_legui_request_when_nobody_has_messaged_yet(): void
    {
        $driver = User::factory()->driver()->create();
        $demLeguiRequest = $this->makeDemLeguiRequest($driver);

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => ['type' => 'dem_legui_request', 'id' => $demLeguiRequest->id]]);
    }

    public function test_prioritizes_the_thread_with_the_most_recent_incoming_message(): void
    {
        $driver = User::factory()->driver()->create();
        $olderBooking = $this->makeBooking($driver);
        $newerRequest = $this->makeDemLeguiRequest($driver);

        // The booking is older, but its rider messaged more recently — that
        // should win over the newer, silent Dem Légui request.
        $message = $olderBooking->messages()->create(['sender_id' => $olderBooking->rider_id, 'body' => 'Bonjour']);

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => [
                'type' => 'booking',
                'id' => $olderBooking->id,
                'latest_message_id' => $message->id,
                'preview' => 'Bonjour',
            ]]);
    }

    public function test_ignores_the_drivers_own_messages_when_picking_by_recency(): void
    {
        $driver = User::factory()->driver()->create();
        $bookingDriverRepliedTo = $this->makeBooking($driver);
        $newerSilentBooking = $this->makeBooking($driver);

        // Only the driver has spoken here — this shouldn't count as "recent
        // activity" that outranks the newer, still-silent booking.
        $bookingDriverRepliedTo->messages()->create(['sender_id' => $driver->id, 'body' => "J'arrive"]);

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => ['type' => 'booking', 'id' => $newerSilentBooking->id]]);
    }

    public function test_active_chat_is_scoped_to_the_authenticated_driver(): void
    {
        $driver = User::factory()->driver()->create();
        $otherDriver = User::factory()->driver()->create();
        $this->makeBooking($otherDriver);

        $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => null]);
    }
}
