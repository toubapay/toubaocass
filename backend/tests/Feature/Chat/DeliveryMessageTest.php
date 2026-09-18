<?php

namespace Tests\Feature\Chat;

use App\Models\Delivery;
use App\Models\User;
use App\Notifications\NewMessageNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DeliveryMessageTest extends TestCase
{
    use RefreshDatabase;

    private function makeDelivery(?User $driver = null): Delivery
    {
        $sender = User::factory()->create();
        $driver ??= User::factory()->driver()->create();

        return Delivery::factory()->create(['sender_id' => $sender->id, 'driver_id' => $driver->id]);
    }

    public function test_sender_can_send_and_view_messages_once_a_driver_is_assigned(): void
    {
        $delivery = $this->makeDelivery();

        $response = $this->actingAs($delivery->sender, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/messages", ['body' => 'Le colis est fragile.'])
            ->assertCreated();

        $this->assertSame('Le colis est fragile.', $response->json('body'));
        $this->assertTrue($response->json('is_mine'));

        $this->actingAs($delivery->sender, 'sanctum')
            ->getJson("/api/deliveries/{$delivery->id}/messages")
            ->assertOk()
            ->assertJsonCount(1);
    }

    public function test_driver_can_view_and_reply(): void
    {
        $delivery = $this->makeDelivery();

        $this->actingAs($delivery->sender, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/messages", ['body' => "J'arrive."])
            ->assertCreated();

        $this->actingAs($delivery->driver, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/messages", ['body' => "Bien reçu."])
            ->assertCreated();

        $this->actingAs($delivery->sender, 'sanctum')
            ->getJson("/api/deliveries/{$delivery->id}/messages")
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_chat_is_forbidden_before_a_driver_is_assigned(): void
    {
        $sender = User::factory()->create();
        $delivery = Delivery::factory()->create(['sender_id' => $sender->id, 'driver_id' => null, 'status' => Delivery::STATUS_PENDING]);
        $randomDriver = User::factory()->driver()->create();

        $this->actingAs($randomDriver, 'sanctum')
            ->getJson("/api/deliveries/{$delivery->id}/messages")
            ->assertForbidden();

        // The sender themselves can still open it (empty thread) — only a
        // driver who isn't assigned yet is blocked.
        $this->actingAs($sender, 'sanctum')
            ->getJson("/api/deliveries/{$delivery->id}/messages")
            ->assertOk();
    }

    public function test_a_third_party_cannot_view_or_send_messages(): void
    {
        $delivery = $this->makeDelivery();
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/deliveries/{$delivery->id}/messages")
            ->assertForbidden();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/messages", ['body' => 'Hello'])
            ->assertForbidden();
    }

    public function test_fetching_the_thread_marks_the_other_partys_messages_as_read(): void
    {
        $delivery = $this->makeDelivery();

        $this->actingAs($delivery->sender, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/messages", ['body' => 'Bonjour']);

        $this->assertNull($delivery->messages()->first()->read_at);

        $this->actingAs($delivery->driver, 'sanctum')->getJson("/api/deliveries/{$delivery->id}/messages")->assertOk();

        $this->assertNotNull($delivery->messages()->first()->fresh()->read_at);
    }

    public function test_sending_a_message_notifies_the_other_participant(): void
    {
        Notification::fake();

        $delivery = $this->makeDelivery();

        $this->actingAs($delivery->sender, 'sanctum')
            ->postJson("/api/deliveries/{$delivery->id}/messages", ['body' => 'Bonjour']);

        Notification::assertSentTo($delivery->driver, NewMessageNotification::class);
        Notification::assertNotSentTo($delivery->sender, NewMessageNotification::class);
    }
}
