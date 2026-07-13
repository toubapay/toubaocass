<?php

namespace Tests\Feature\Delivery;

use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Notifications\DeliveryAcceptedNotification;
use App\Notifications\DeliveryCancelledNotification;
use App\Notifications\DeliveryDeliveredNotification;
use App\Notifications\DeliveryPickedUpNotification;
use App\Notifications\DeliveryRequestedNotification;
use App\Services\DeliveryPricingService;
use App\Services\WalletService;
use App\Support\Geo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DeliveryTest extends TestCase
{
    use RefreshDatabase;

    private const PICKUP_LAT = 14.72;

    private const PICKUP_LNG = -17.46;

    private const RECEIVER_LAT = 14.68;

    private const RECEIVER_LNG = -17.44;

    private function payload(): array
    {
        return [
            'receiver_name' => 'Awa Diop',
            'receiver_phone' => '+221770001122',
            'receiver_address_line' => 'Sacré-Cœur 3, Dakar',
            'receiver_latitude' => self::RECEIVER_LAT,
            'receiver_longitude' => self::RECEIVER_LNG,
            'pickup_address_line' => 'Plateau, Dakar',
            'pickup_latitude' => self::PICKUP_LAT,
            'pickup_longitude' => self::PICKUP_LNG,
            'package_type' => Delivery::PACKAGE_TYPE_COLIS_LEGER,
        ];
    }

    private function expectedQuote(): array
    {
        return app(DeliveryPricingService::class)->quote(self::PICKUP_LAT, self::PICKUP_LNG, self::RECEIVER_LAT, self::RECEIVER_LNG);
    }

    public function test_quote_endpoint_returns_server_computed_distance_and_fee(): void
    {
        $rider = User::factory()->create();
        $expected = $this->expectedQuote();

        $this->actingAs($rider, 'sanctum')
            ->postJson('/api/deliveries/quote', [
                'pickup_latitude' => self::PICKUP_LAT,
                'pickup_longitude' => self::PICKUP_LNG,
                'receiver_latitude' => self::RECEIVER_LAT,
                'receiver_longitude' => self::RECEIVER_LNG,
            ])
            ->assertOk()
            ->assertJsonPath('distance_km', $expected['distance_km'])
            ->assertJsonPath('fee', $expected['fee']);

        $this->assertGreaterThan(0, Geo::haversineKm(self::PICKUP_LAT, self::PICKUP_LNG, self::RECEIVER_LAT, self::RECEIVER_LNG));
    }

    public function test_store_ignores_client_supplied_fee_and_distance(): void
    {
        $rider = User::factory()->create();
        $expected = $this->expectedQuote();

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/deliveries', [
                ...$this->payload(),
                'fee' => 1,
                'distance_km' => 0.01,
            ])
            ->assertCreated();

        $response->assertJsonPath('fee', $expected['fee']);
        $response->assertJsonPath('distance_km', $expected['distance_km']);
    }

    public function test_rider_can_create_and_list_their_own_deliveries(): void
    {
        $rider = User::factory()->create();

        $created = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/deliveries', $this->payload())
            ->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->json();

        $this->actingAs($rider, 'sanctum')
            ->getJson('/api/deliveries')
            ->assertOk()
            ->assertJsonPath('data.0.id', $created['id']);
    }

    public function test_rider_cannot_view_another_riders_delivery(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $delivery = Delivery::factory()->create(['sender_id' => $owner->id]);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/deliveries/{$delivery->id}")
            ->assertNotFound();
    }

    public function test_only_kyc_approved_driver_can_accept_a_delivery(): void
    {
        $rider = User::factory()->create();
        $delivery = Delivery::factory()->create(['sender_id' => $rider->id]);

        $unapprovedDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $unapprovedDriver->id, 'kyc_status' => DriverProfile::STATUS_PENDING]);

        $this->actingAs($unapprovedDriver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/accept")
            ->assertUnprocessable();

        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'status' => 'pending', 'driver_id' => null]);
    }

    public function test_a_rider_account_cannot_use_the_driver_accept_endpoint(): void
    {
        $rider = User::factory()->create();
        $delivery = Delivery::factory()->create(['sender_id' => $rider->id]);

        $this->actingAs($rider, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/accept")
            ->assertForbidden();
    }

    public function test_accepting_charges_sender_wallet_and_credits_driver_when_payment_method_is_wallet(): void
    {
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'payment_method' => Delivery::PAYMENT_METHOD_WALLET,
            'fee' => 2500,
        ]);

        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/accept")
            ->assertOk()
            ->assertJsonPath('status', 'accepted');

        $this->assertSame(7500, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(2500, Wallet::where('user_id', $driver->id)->value('balance'));
    }

    public function test_accepting_fails_if_sender_wallet_balance_is_insufficient(): void
    {
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 1000);

        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'payment_method' => Delivery::PAYMENT_METHOD_WALLET,
            'fee' => 2500,
        ]);

        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/accept")
            ->assertUnprocessable();

        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'status' => 'pending', 'driver_id' => null]);
        $this->assertSame(1000, Wallet::where('user_id', $rider->id)->value('balance'));
    }

    public function test_only_the_assigned_driver_can_mark_picked_up_or_delivered(): void
    {
        $rider = User::factory()->create();
        $driver = User::factory()->driver()->create();
        $otherDriver = User::factory()->driver()->create();

        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_ACCEPTED,
        ]);

        $this->actingAs($otherDriver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/pickup")
            ->assertForbidden();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/pickup")
            ->assertOk()
            ->assertJsonPath('status', 'picked_up');

        $this->actingAs($otherDriver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/deliver")
            ->assertForbidden();

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/deliver")
            ->assertOk()
            ->assertJsonPath('status', 'delivered');
    }

    public function test_full_lifecycle_pending_to_delivered_sets_timestamps_in_order(): void
    {
        $rider = User::factory()->create();
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);

        $created = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/deliveries', $this->payload())
            ->json();

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$created['id']}/accept")->assertOk();
        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$created['id']}/pickup")->assertOk();
        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$created['id']}/deliver")->assertOk();

        $delivery = Delivery::find($created['id']);
        $this->assertSame('delivered', $delivery->status);
        $this->assertNotNull($delivery->accepted_at);
        $this->assertNotNull($delivery->picked_up_at);
        $this->assertNotNull($delivery->delivered_at);
        $this->assertTrue($delivery->accepted_at->lte($delivery->picked_up_at));
        $this->assertTrue($delivery->picked_up_at->lte($delivery->delivered_at));
    }

    public function test_invalid_status_transitions_are_rejected(): void
    {
        $rider = User::factory()->create();
        $driver = User::factory()->driver()->create();

        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_ACCEPTED,
        ]);

        // Can't jump straight to "delivered" while still merely "accepted"
        // (pickup hasn't happened yet).
        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/deliver")
            ->assertUnprocessable();

        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'status' => 'accepted']);
    }

    public function test_rider_can_cancel_a_pending_or_accepted_delivery_and_wallet_is_refunded_if_already_charged(): void
    {
        $rider = User::factory()->create();
        app(WalletService::class)->topUp($rider, 10000);

        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);

        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'payment_method' => Delivery::PAYMENT_METHOD_WALLET,
            'fee' => 2500,
        ]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$delivery->id}/accept")->assertOk();
        $this->assertSame(7500, Wallet::where('user_id', $rider->id)->value('balance'));

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/deliveries/{$delivery->id}")
            ->assertOk();

        $this->assertSame(10000, Wallet::where('user_id', $rider->id)->value('balance'));
        $this->assertSame(0, Wallet::where('user_id', $driver->id)->value('balance'));
        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'status' => 'cancelled']);
    }

    public function test_cancelling_after_pickup_is_rejected(): void
    {
        $rider = User::factory()->create();
        $driver = User::factory()->driver()->create();

        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_PICKED_UP,
        ]);

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/deliveries/{$delivery->id}")
            ->assertUnprocessable();
    }

    public function test_notifications_are_sent_through_the_delivery_lifecycle(): void
    {
        Notification::fake();

        $rider = User::factory()->create();
        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id]);

        $created = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/deliveries', $this->payload())
            ->json();

        Notification::assertSentTo($rider, DeliveryRequestedNotification::class);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$created['id']}/accept")->assertOk();
        Notification::assertSentTo($rider, DeliveryAcceptedNotification::class);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$created['id']}/pickup")->assertOk();
        Notification::assertSentTo($rider, DeliveryPickedUpNotification::class);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/deliveries/{$created['id']}/deliver")->assertOk();
        Notification::assertSentTo($rider, DeliveryDeliveredNotification::class);
    }

    public function test_cancellation_notification_is_sent_to_the_assigned_driver(): void
    {
        Notification::fake();

        $rider = User::factory()->create();
        $driver = User::factory()->driver()->create();

        $delivery = Delivery::factory()->create([
            'sender_id' => $rider->id,
            'driver_id' => $driver->id,
            'status' => Delivery::STATUS_ACCEPTED,
        ]);

        $this->actingAs($rider, 'sanctum')
            ->deleteJson("/api/deliveries/{$delivery->id}")
            ->assertOk();

        Notification::assertSentTo($driver, DeliveryCancelledNotification::class);
    }
}
