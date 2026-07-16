<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_support_admin_can_list_and_search_users(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_SUPPORT)->create();
        User::factory()->create(['name' => 'Awa Ndiaye', 'phone' => '+221771111111']);
        User::factory()->driver()->create(['name' => 'Moussa Diop', 'phone' => '+221772222222']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users?search=Awa')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
        $response->assertJsonFragment(['name' => 'Awa Ndiaye']);
    }

    public function test_accountant_cannot_access_user_management(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_admin_can_view_user_detail_with_summary_counts(): void
    {
        $admin = AdminUser::factory()->create();
        $driver = User::factory()->driver()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/users/{$driver->id}")
            ->assertOk();

        $response->assertJson(['id' => $driver->id, 'role' => 'driver']);
        $this->assertArrayHasKey('cars_count', $response->json());
    }

    public function test_admin_can_suspend_and_reactivate_a_user(): void
    {
        $admin = AdminUser::factory()->create();
        $user = User::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$user->id}/status", ['status' => 'suspended'])
            ->assertOk()
            ->assertJson(['status' => 'suspended']);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'suspended']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$user->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJson(['status' => 'active']);
    }
}
