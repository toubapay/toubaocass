<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_log_in_with_correct_credentials(): void
    {
        $admin = AdminUser::factory()->create(['email' => 'chef@intercity.test']);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'chef@intercity.test',
            'password' => 'password',
        ])->assertOk();

        $this->assertNotEmpty($response->json('token'));
        $response->assertJson(['admin' => ['email' => 'chef@intercity.test', 'role' => $admin->role]]);
        $this->assertNotNull($admin->fresh()->last_login_at);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        AdminUser::factory()->create(['email' => 'chef@intercity.test']);

        $this->postJson('/api/admin/login', [
            'email' => 'chef@intercity.test',
            'password' => 'wrong-password',
        ])->assertUnprocessable();
    }

    public function test_suspended_admin_cannot_log_in(): void
    {
        AdminUser::factory()->suspended()->create(['email' => 'suspendu@intercity.test']);

        $this->postJson('/api/admin/login', [
            'email' => 'suspendu@intercity.test',
            'password' => 'password',
        ])->assertUnprocessable();
    }

    public function test_authenticated_admin_can_fetch_own_profile_with_permissions(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/me')
            ->assertOk()
            ->assertJson(['role' => 'accountant'])
            ->assertJsonFragment(['view_financials']);
    }

    public function test_rider_or_driver_token_cannot_access_admin_routes(): void
    {
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }
}
