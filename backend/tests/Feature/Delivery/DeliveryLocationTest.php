<?php

namespace Tests\Feature\Delivery;

use App\Models\Delivery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryLocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_can_report_location_while_the_delivery_is_picked_up(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_PICKED_UP]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
            ->assertOk();

        $delivery->refresh();
        $this->assertSame(14.6928, $delivery->current_latitude);
        $this->assertSame(-17.4467, $delivery->current_longitude);
        $this->assertNotNull($delivery->current_location_updated_at);
    }

    public function test_only_the_owning_driver_can_report_location(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_PICKED_UP]);
        $stranger = User::factory()->driver()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
            ->assertForbidden();
    }

    public function test_location_cannot_be_reported_unless_the_delivery_is_picked_up(): void
    {
        $driver = User::factory()->driver()->create();

        foreach ([Delivery::STATUS_PENDING, Delivery::STATUS_ACCEPTED, Delivery::STATUS_DELIVERED, Delivery::STATUS_CANCELLED] as $status) {
            $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => $status]);

            $this->actingAs($driver, 'sanctum')
                ->postJson("/api/driver/deliveries/{$delivery->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
                ->assertUnprocessable();
        }
    }

    public function test_location_update_rejects_out_of_range_coordinates(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_PICKED_UP]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/location", ['latitude' => 200, 'longitude' => -17.4467])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('latitude');
    }

    public function test_the_sender_sees_the_reported_location_via_show(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_PICKED_UP]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/location", ['latitude' => 14.6928, 'longitude' => -17.4467])
            ->assertOk();

        $this->actingAs($delivery->sender, 'sanctum')
            ->getJson("/api/deliveries/{$delivery->id}")
            ->assertOk()
            ->assertJsonPath('current_latitude', 14.6928)
            ->assertJsonPath('current_longitude', -17.4467);
    }
}
