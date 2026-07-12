<?php

namespace Tests\Feature\Chat;

use App\Models\Booking;
use App\Models\Trip;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MessageTest extends TestCase
{
    use RefreshDatabase;

    private function makeBooking(): Booking
    {
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create(['driver_id' => $driver->id]);
        $rider = User::factory()->create();

        return Booking::factory()->create(['trip_id' => $trip->id, 'rider_id' => $rider->id]);
    }

    public function test_rider_can_send_and_view_messages_on_their_own_booking(): void
    {
        $booking = $this->makeBooking();

        $response = $this->actingAs($booking->rider, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'Bonjour, je serai à la gare à 7h.'])
            ->assertCreated();

        $this->assertSame('Bonjour, je serai à la gare à 7h.', $response->json('body'));
        $this->assertTrue($response->json('is_mine'));

        $this->actingAs($booking->rider, 'sanctum')
            ->getJson("/api/bookings/{$booking->id}/messages")
            ->assertOk()
            ->assertJsonCount(1);
    }

    public function test_driver_can_view_and_reply_to_a_booking_chat(): void
    {
        $booking = $this->makeBooking();
        $driver = $booking->trip->driver;

        $this->actingAs($booking->rider, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'Je suis en route.'])
            ->assertCreated();

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson("/api/bookings/{$booking->id}/messages")
            ->assertOk();

        $this->assertFalse($response->json('0.is_mine'));

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/messages", ['body' => "D'accord, à tout à l'heure."])
            ->assertCreated();

        $this->actingAs($booking->rider, 'sanctum')
            ->getJson("/api/bookings/{$booking->id}/messages")
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_a_third_party_cannot_view_or_send_messages_on_someone_elses_booking(): void
    {
        $booking = $this->makeBooking();
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/bookings/{$booking->id}/messages")
            ->assertForbidden();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'Hello'])
            ->assertForbidden();
    }

    public function test_message_body_is_required(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($booking->rider, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/messages", ['body' => ''])
            ->assertStatus(422);
    }

    public function test_fetching_the_thread_marks_the_other_partys_messages_as_read(): void
    {
        $booking = $this->makeBooking();
        $driver = $booking->trip->driver;

        $this->actingAs($booking->rider, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'Bonjour']);

        $this->assertNull($booking->messages()->first()->read_at);

        $this->actingAs($driver, 'sanctum')->getJson("/api/bookings/{$booking->id}/messages")->assertOk();

        $this->assertNotNull($booking->messages()->first()->fresh()->read_at);
    }

    public function test_sending_a_message_notifies_the_other_participant(): void
    {
        Notification::fake();

        $booking = $this->makeBooking();
        $driver = $booking->trip->driver;

        $this->actingAs($booking->rider, 'sanctum')
            ->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'Bonjour']);

        Notification::assertSentTo($driver, NewMessageNotification::class);
        Notification::assertNotSentTo($booking->rider, NewMessageNotification::class);
    }
}
