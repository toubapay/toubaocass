<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Booking;
use App\Models\Delivery;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminFaresAndCommissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_completing_a_trip_calculates_commission_on_confirmed_bookings(): void
    {
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create(['driver_id' => $driver->id, 'status' => Trip::STATUS_IN_PROGRESS]);
        $booking = Booking::factory()->create([
            'trip_id' => $trip->id,
            'fare_total' => 10000,
            'status' => Booking::STATUS_CONFIRMED,
        ]);
        $cancelledBooking = Booking::factory()->create([
            'trip_id' => $trip->id,
            'fare_total' => 5000,
            'status' => Booking::STATUS_CANCELLED,
        ]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/trips/{$trip->id}/complete")
            ->assertOk();

        // Default rate is 15% when no admin override exists.
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'commission_rate' => '15.00',
            'commission_amount' => 1500,
        ]);

        // Cancelled bookings never get a commission calculated.
        $this->assertDatabaseHas('bookings', ['id' => $cancelledBooking->id, 'commission_amount' => null]);
    }

    public function test_delivering_calculates_commission(): void
    {
        $driver = User::factory()->driver()->create();
        $delivery = Delivery::factory()->create([
            'driver_id' => $driver->id,
            'fee' => 2000,
            'status' => Delivery::STATUS_PICKED_UP,
        ]);

        $this->actingAs($driver, 'sanctum')
            ->postJson("/api/driver/deliveries/{$delivery->id}/deliver")
            ->assertOk();

        $this->assertDatabaseHas('deliveries', [
            'id' => $delivery->id,
            'commission_rate' => '15.00',
            'commission_amount' => 300,
        ]);
    }

    public function test_admin_with_manage_fares_can_view_and_update_settings(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings/fares')
            ->assertOk()
            ->assertJsonPath('commission_rate_trip', 15);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings/fares', ['commission_rate_trip' => 20])
            ->assertOk()
            ->assertJsonPath('commission_rate_trip', 20);

        // A new completion picks up the updated rate.
        $driver = User::factory()->driver()->create();
        $trip = Trip::factory()->create(['driver_id' => $driver->id, 'status' => Trip::STATUS_IN_PROGRESS]);
        $booking = Booking::factory()->create(['trip_id' => $trip->id, 'fare_total' => 1000, 'status' => Booking::STATUS_CONFIRMED]);

        $this->actingAs($driver, 'sanctum')->postJson("/api/driver/trips/{$trip->id}/complete")->assertOk();

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'commission_amount' => 200]);
    }

    public function test_support_cannot_manage_fares(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_SUPPORT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings/fares')
            ->assertForbidden();
    }

    public function test_financials_summary_aggregates_commission_and_driver_earnings(): void
    {
        $admin = AdminUser::factory()->create();

        $trip = Trip::factory()->create(['status' => Trip::STATUS_COMPLETED]);
        Booking::factory()->create([
            'trip_id' => $trip->id,
            'fare_total' => 10000,
            'commission_rate' => 15,
            'commission_amount' => 1500,
            'status' => Booking::STATUS_CONFIRMED,
        ]);
        Delivery::factory()->create([
            'fee' => 2000,
            'commission_rate' => 15,
            'commission_amount' => 300,
            'status' => Delivery::STATUS_DELIVERED,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/financials/summary')
            ->assertOk();

        $response->assertJsonPath('trips.commission_earned', 1500);
        $response->assertJsonPath('trips.driver_earnings', 8500);
        $response->assertJsonPath('deliveries.commission_earned', 300);
        $response->assertJsonPath('total_commission_earned', 1800);
        $response->assertJsonPath('total_driver_earnings', 10200);
    }

    public function test_role_without_view_financials_is_forbidden(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_SUPPORT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/financials/summary')
            ->assertForbidden();
    }
}
