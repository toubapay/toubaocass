<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Booking;
use App\Models\Car;
use App\Models\DriverProfile;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_trips(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        Trip::factory()->count(3)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_without_permission_cannot_list_trips(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/trips')->assertForbidden();
    }

    public function test_admin_can_cancel_a_trip_and_refund_wallet_bookings(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);
        $rider = User::factory()->create();
        $booking = Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $rider->id,
            'fare_total' => 3000,
            'payment_method' => Booking::PAYMENT_METHOD_WALLET,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/trips/{$trip->id}/cancel")
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => Trip::STATUS_CANCELLED]);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => Booking::STATUS_CANCELLED]);
        $this->assertDatabaseHas('wallets', ['user_id' => $rider->id, 'balance' => 3000]);
        $this->assertDatabaseHas('audit_logs', ['admin_id' => $admin->id, 'action' => 'trip.cancel']);
    }

    public function test_admin_cannot_cancel_an_already_completed_trip(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $trip = Trip::factory()->create(['status' => Trip::STATUS_COMPLETED]);

        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/trips/{$trip->id}/cancel")
            ->assertStatus(422);

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'status' => Trip::STATUS_COMPLETED]);
    }

    public function test_admin_can_reassign_a_trip_to_an_approved_driver_with_an_active_car(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        $newCar = Car::factory()->create(['driver_id' => $newDriver->id, 'is_active' => true]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/trips/{$trip->id}/driver", ['driver_id' => $newDriver->id])
            ->assertOk()
            ->assertJsonPath('driver_id', $newDriver->id);

        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'driver_id' => $newDriver->id, 'car_id' => $newCar->id]);
        $this->assertDatabaseHas('audit_logs', ['admin_id' => $admin->id, 'action' => 'trip.assign_driver']);
    }

    public function test_admin_cannot_reassign_a_trip_to_a_driver_without_an_active_car(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $trip = Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/trips/{$trip->id}/driver", ['driver_id' => $newDriver->id])
            ->assertStatus(422);
    }

    public function test_admin_cannot_reassign_a_trip_already_in_progress(): void
    {
        $admin = AdminUser::factory()->superAdmin()->create();
        $trip = Trip::factory()->create(['status' => Trip::STATUS_IN_PROGRESS]);

        $newDriver = User::factory()->driver()->create();
        DriverProfile::factory()->create(['user_id' => $newDriver->id, 'kyc_status' => DriverProfile::STATUS_APPROVED]);
        Car::factory()->create(['driver_id' => $newDriver->id, 'is_active' => true]);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/trips/{$trip->id}/driver", ['driver_id' => $newDriver->id])
            ->assertStatus(422);
    }
}
