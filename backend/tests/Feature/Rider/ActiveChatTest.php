<?php

namespace Tests\Feature\Rider;

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

    private function makeBooking(User $rider): Booking
    {
        $trip = Trip::factory()->create(['driver_id' => User::factory()->driver()->create()->id]);

        return Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id, 'status' => Booking::STATUS_CONFIRMED]);
    }

    private function makeDemLeguiRequest(User $rider): DemLeguiRequest
    {
        $driver = User::factory()->driver()->create();
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
            'rider_id' => $rider->id,
            'dem_legui_trip_id' => $demLeguiTrip->id,
            'status' => DemLeguiRequest::STATUS_MATCHED,
        ]);
    }

    public function test_no_active_chat_when_rider_has_nothing(): void
    {
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/rider/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => null]);
    }

    public function test_falls_back_to_the_booking_when_nobody_has_messaged_yet(): void
    {
        $rider = User::factory()->create();
        $booking = $this->makeBooking($rider);

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/rider/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => [
                'type' => 'booking',
                'id' => $booking->id,
                'other_party_name' => $booking->trip->driver->name,
                'latest_message_id' => null,
            ]]);
    }

    public function test_falls_back_to_the_dem_legui_request_when_nobody_has_messaged_yet(): void
    {
        $rider = User::factory()->create();
        $demLeguiRequest = $this->makeDemLeguiRequest($rider);

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/rider/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => ['type' => 'dem_legui_request', 'id' => $demLeguiRequest->id]]);
    }

    public function test_prioritizes_the_thread_with_the_most_recent_incoming_message(): void
    {
        $rider = User::factory()->create();
        $olderBooking = $this->makeBooking($rider);
        $this->makeDemLeguiRequest($rider);

        $driver = $olderBooking->trip->driver;
        $message = $olderBooking->messages()->create(['sender_id' => $driver->id, 'body' => "J'arrive dans 5 minutes."]);

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/rider/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => [
                'type' => 'booking',
                'id' => $olderBooking->id,
                'latest_message_id' => $message->id,
                'preview' => "J'arrive dans 5 minutes.",
            ]]);
    }

    public function test_active_chat_is_scoped_to_the_authenticated_rider(): void
    {
        $rider = User::factory()->create();
        $otherRider = User::factory()->create();
        $this->makeBooking($otherRider);

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/rider/active-chat')
            ->assertOk()
            ->assertJson(['active_chat' => null]);
    }
}
