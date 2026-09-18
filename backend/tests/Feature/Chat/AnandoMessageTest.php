<?php

namespace Tests\Feature\Chat;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AnandoMessageTest extends TestCase
{
    use RefreshDatabase;

    private function makeBooking(): AnandoRideBooking
    {
        $poster = User::factory()->create();
        $ride = AnandoRide::factory()->create(['user_id' => $poster->id]);
        $joiner = User::factory()->create();

        return AnandoRideBooking::factory()->create(['anando_ride_id' => $ride->id, 'user_id' => $joiner->id]);
    }

    public function test_joiner_can_send_and_view_messages_on_their_booking(): void
    {
        $booking = $this->makeBooking();

        $response = $this->actingAs($booking->user, 'sanctum')
            ->postJson("/api/anando-ride-bookings/{$booking->id}/messages", ['body' => 'Je serai là à 8h.'])
            ->assertCreated();

        $this->assertSame('Je serai là à 8h.', $response->json('body'));
        $this->assertTrue($response->json('is_mine'));

        $this->actingAs($booking->user, 'sanctum')
            ->getJson("/api/anando-ride-bookings/{$booking->id}/messages")
            ->assertOk()
            ->assertJsonCount(1);
    }

    public function test_poster_can_view_and_reply(): void
    {
        $booking = $this->makeBooking();
        $poster = $booking->anandoRide->poster;

        $this->actingAs($booking->user, 'sanctum')
            ->postJson("/api/anando-ride-bookings/{$booking->id}/messages", ['body' => 'Je suis en route.'])
            ->assertCreated();

        $this->actingAs($poster, 'sanctum')
            ->postJson("/api/anando-ride-bookings/{$booking->id}/messages", ['body' => "D'accord."])
            ->assertCreated();

        $this->actingAs($booking->user, 'sanctum')
            ->getJson("/api/anando-ride-bookings/{$booking->id}/messages")
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_a_third_party_cannot_view_or_send_messages(): void
    {
        $booking = $this->makeBooking();
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/anando-ride-bookings/{$booking->id}/messages")
            ->assertForbidden();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/anando-ride-bookings/{$booking->id}/messages", ['body' => 'Hello'])
            ->assertForbidden();
    }

    public function test_fetching_the_thread_marks_the_other_partys_messages_as_read(): void
    {
        $booking = $this->makeBooking();
        $poster = $booking->anandoRide->poster;

        $this->actingAs($booking->user, 'sanctum')
            ->postJson("/api/anando-ride-bookings/{$booking->id}/messages", ['body' => 'Bonjour']);

        $this->assertNull($booking->messages()->first()->read_at);

        $this->actingAs($poster, 'sanctum')->getJson("/api/anando-ride-bookings/{$booking->id}/messages")->assertOk();

        $this->assertNotNull($booking->messages()->first()->fresh()->read_at);
    }

    public function test_sending_a_message_notifies_the_other_participant(): void
    {
        Notification::fake();

        $booking = $this->makeBooking();
        $poster = $booking->anandoRide->poster;

        $this->actingAs($booking->user, 'sanctum')
            ->postJson("/api/anando-ride-bookings/{$booking->id}/messages", ['body' => 'Bonjour']);

        Notification::assertSentTo($poster, NewMessageNotification::class);
        Notification::assertNotSentTo($booking->user, NewMessageNotification::class);
    }
}
