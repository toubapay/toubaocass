<?php

namespace Tests\Feature\Delivery;

use App\Models\Delivery;
use App\Models\User;
use App\Services\DeliveryPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryUpdateTest extends TestCase
{
    use RefreshDatabase;

    private const NEW_RECEIVER_LAT = 14.75;

    private const NEW_RECEIVER_LNG = -17.42;

    private function payload(): array
    {
        return [
            'receiver_name' => 'Fatou Sow',
            'receiver_phone' => '+221771234567',
            'receiver_address_line' => 'Point E, Dakar',
            'receiver_latitude' => self::NEW_RECEIVER_LAT,
            'receiver_longitude' => self::NEW_RECEIVER_LNG,
            'pickup_address_line' => 'Plateau, Dakar',
            'pickup_latitude' => 14.6928,
            'pickup_longitude' => -17.4467,
            'package_type' => Delivery::PACKAGE_TYPE_COLIS_MOYEN,
            'notes' => 'Sonnez deux fois',
            'payment_method' => Delivery::PAYMENT_METHOD_CASH,
        ];
    }

    public function test_sender_can_edit_a_pending_delivery_and_fee_is_recomputed(): void
    {
        $sender = User::factory()->create();
        $delivery = Delivery::factory()->create(['sender_id' => $sender->id, 'status' => Delivery::STATUS_PENDING]);

        $response = $this->actingAs($sender, 'sanctum')
            ->putJson("/api/deliveries/{$delivery->id}", $this->payload())
            ->assertOk();

        $expectedQuote = app(DeliveryPricingService::class)->quote(
            14.6928,
            -17.4467,
            self::NEW_RECEIVER_LAT,
            self::NEW_RECEIVER_LNG,
        );

        $response->assertJsonPath('receiver_name', 'Fatou Sow');
        $response->assertJsonPath('package_type', Delivery::PACKAGE_TYPE_COLIS_MOYEN);
        $response->assertJsonPath('fee', $expectedQuote['fee']);
        $response->assertJsonPath('distance_km', $expectedQuote['distance_km']);

        $this->assertDatabaseHas('deliveries', [
            'id' => $delivery->id,
            'receiver_name' => 'Fatou Sow',
            'fee' => $expectedQuote['fee'],
        ]);
    }

    public function test_a_stranger_cannot_edit_another_senders_delivery(): void
    {
        $delivery = Delivery::factory()->create(['status' => Delivery::STATUS_PENDING]);
        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->putJson("/api/deliveries/{$delivery->id}", $this->payload())
            ->assertNotFound();
    }

    public function test_a_non_pending_delivery_cannot_be_edited(): void
    {
        $sender = User::factory()->create();

        foreach ([Delivery::STATUS_ACCEPTED, Delivery::STATUS_PICKED_UP, Delivery::STATUS_DELIVERED, Delivery::STATUS_CANCELLED] as $status) {
            $delivery = Delivery::factory()->create(['sender_id' => $sender->id, 'status' => $status]);

            $this->actingAs($sender, 'sanctum')
                ->putJson("/api/deliveries/{$delivery->id}", $this->payload())
                ->assertStatus(422);
        }
    }

    public function test_edit_validates_required_fields(): void
    {
        $sender = User::factory()->create();
        $delivery = Delivery::factory()->create(['sender_id' => $sender->id, 'status' => Delivery::STATUS_PENDING]);

        $this->actingAs($sender, 'sanctum')
            ->putJson("/api/deliveries/{$delivery->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receiver_name', 'receiver_phone', 'pickup_address_line', 'package_type']);
    }
}
