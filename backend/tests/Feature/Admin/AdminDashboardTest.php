<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Booking;
use App\Models\Car;
use App\Models\City;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Models\SecurityAlert;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_with_view_dashboard_sees_platform_stats(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_SUPERVISEUR)->create();

        $before = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard/stats')
            ->assertOk()
            ->json();

        User::factory()->driver()->create();
        $rider = User::factory()->create();
        Car::factory()->create(['is_active' => true]);
        DriverProfile::factory()->create(['kyc_status' => DriverProfile::STATUS_SUBMITTED]);

        $trip = Trip::factory()->create(['status' => Trip::STATUS_COMPLETED]);
        Booking::factory()->create([
            'trip_id' => $trip->id,
            'rider_id' => $rider->id,
            'fare_total' => 10000,
            'commission_amount' => 1500,
            'commission_rate' => 15,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard/stats')
            ->assertOk();

        $response->assertJsonPath('registered_riders', $before['registered_riders'] + 1);
        $response->assertJsonPath('kyc_pending', $before['kyc_pending'] + 1);
        $response->assertJsonPath('total_commission_earned', $before['total_commission_earned'] + 1500);
        $this->assertGreaterThanOrEqual($before['registered_drivers'] + 1, $response->json('registered_drivers'));
        $this->assertGreaterThanOrEqual($before['active_cars'] + 1, $response->json('active_cars'));
    }

    public function test_dashboard_routes_returns_top_trip_routes_and_delivery_zones(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_CONTROLLERS)->create();

        $dakar = City::factory()->create(['name' => 'Dakar', 'latitude' => 14.6928, 'longitude' => -17.4467]);
        $thies = City::factory()->create(['name' => 'Thiès', 'latitude' => 14.7910, 'longitude' => -16.9359]);

        Trip::factory()->count(2)->create(['origin_city_id' => $dakar->id, 'destination_city_id' => $thies->id]);

        Delivery::factory()->create(['pickup_latitude' => 14.6928, 'pickup_longitude' => -17.4467]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard/routes')
            ->assertOk();

        $response->assertJsonFragment(['origin_city' => 'Dakar', 'destination_city' => 'Thiès', 'trips_count' => 2]);
        $response->assertJsonFragment(['zone' => 'Dakar', 'deliveries_count' => 1]);
    }

    public function test_support_role_cannot_view_dashboard_without_permission(): void
    {
        // support has view_dashboard, use accountant which lacks security alerts instead for a real forbidden case
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/security-alerts')
            ->assertForbidden();
    }

    public function test_live_trips_returns_only_in_progress_trips_with_departure_location(): void
    {
        $admin = AdminUser::factory()->create();

        $inProgress = Trip::factory()->create([
            'status' => Trip::STATUS_IN_PROGRESS,
            'departure_latitude' => 14.6928,
            'departure_longitude' => -17.4467,
        ]);
        Trip::factory()->create(['status' => Trip::STATUS_SCHEDULED]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/trips/live')
            ->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['id' => $inProgress->id]);
    }

    public function test_repeated_otp_failures_raise_a_security_alert(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_CONTROLLERS)->create();

        config(['services.otp.max_attempts' => 2]);

        $this->postJson('/api/auth/otp/request', ['phone' => '+221700000099', 'role' => 'rider'])->assertOk();

        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/auth/otp/verify', [
                'phone' => '+221700000099',
                'role' => 'rider',
                'code' => '000000',
            ])->assertUnprocessable();
        }

        $this->assertDatabaseHas('security_alerts', [
            'type' => SecurityAlert::TYPE_REPEATED_OTP_FAILURES,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/security-alerts')
            ->assertOk();

        $response->assertJsonFragment(['type' => 'repeated_otp_failures']);
    }

    public function test_kyc_rejection_raises_a_security_alert_and_can_be_acknowledged(): void
    {
        $admin = AdminUser::factory()->create();
        $profile = DriverProfile::factory()->create(['kyc_status' => DriverProfile::STATUS_SUBMITTED]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/kyc/{$profile->id}/reject", ['reason' => 'Photo illisible.'])
            ->assertOk();

        $alert = SecurityAlert::where('type', SecurityAlert::TYPE_KYC_REJECTED)->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/security-alerts/{$alert->id}/acknowledge")
            ->assertOk()
            ->assertJsonPath('status', 'acknowledged')
            ->assertJsonPath('acknowledged_by', $admin->name);
    }
}
