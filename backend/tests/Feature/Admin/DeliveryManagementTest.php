<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_deliveries(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        Delivery::factory()->count(2)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/deliveries')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_admin_without_permission_cannot_list_deliveries(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/deliveries')->assertForbidden();
    }

    public function test_admin_can_cancel_a_pending_delivery(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $delivery = Delivery::factory()->create(['status' => Delivery::STATUS_PENDING]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/deliveries/{$delivery->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');

        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'status' => Delivery::STATUS_CANCELLED]);
        $this->assertDatabaseHas('audit_logs', ['admin_id' => $admin->id, 'action' => 'delivery.cancel']);
    }

    public function test_admin_cannot_cancel_an_already_picked_up_delivery(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['driver_id' => $driver->id, 'status' => Delivery::STATUS_PICKED_UP]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/deliveries/{$delivery->id}/cancel")
            ->assertStatus(422);

        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'status' => Delivery::STATUS_PICKED_UP]);
    }

    public function test_admin_can_assign_an_unassigned_delivery_to_an_approved_driver(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $delivery = Delivery::factory()->create(['status' => Delivery::STATUS_PENDING, 'driver_id' => null]);

        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/deliveries/{$delivery->id}/driver", ['driver_id' => $driver->id])
            ->assertOk()
            ->assertJsonPath('driver_id', $driver->id)
            ->assertJsonPath('status', 'accepted');

        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'driver_id' => $driver->id, 'status' => Delivery::STATUS_ACCEPTED]);
        $this->assertDatabaseHas('audit_logs', ['admin_id' => $admin->id, 'action' => 'delivery.assign_driver']);
    }

    public function test_admin_can_reassign_an_accepted_delivery_to_a_different_driver(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $originalDriver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['status' => Delivery::STATUS_ACCEPTED, 'driver_id' => $originalDriver->id, 'accepted_at' => now()]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/deliveries/{$delivery->id}/driver", ['driver_id' => $newDriver->id])
            ->assertOk()
            ->assertJsonPath('driver_id', $newDriver->id);

        $this->assertDatabaseHas('deliveries', ['id' => $delivery->id, 'driver_id' => $newDriver->id]);
    }

    public function test_admin_cannot_assign_a_delivery_already_picked_up(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create(['status' => Delivery::STATUS_PICKED_UP, 'driver_id' => $driver->id]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/deliveries/{$delivery->id}/driver", ['driver_id' => $newDriver->id])
            ->assertStatus(422);
    }

    public function test_admin_cannot_assign_a_delivery_to_a_driver_without_approved_kyc(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $delivery = Delivery::factory()->create(['status' => Delivery::STATUS_PENDING]);

        $driver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $driver->id, 'kyc_status' => DriverProfile::STATUS_SUBMITTED]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/deliveries/{$delivery->id}/driver", ['driver_id' => $driver->id])
            ->assertStatus(422);
    }

    public function test_admin_can_list_eligible_drivers(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();

        $approved = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $approved->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);

        $unapproved = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $unapproved->id, 'kyc_status' => DriverProfile::STATUS_SUBMITTED]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/drivers/eligible')->assertOk();

        $ids = collect($response->json('drivers'))->pluck('id');
        $this->assertTrue($ids->contains($approved->id));
        $this->assertFalse($ids->contains($unapproved->id));
    }
}
