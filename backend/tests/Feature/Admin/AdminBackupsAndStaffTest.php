<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminBackupsAndStaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_list_backups(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('Intercity/2026-01-01-00-00-00.zip', str_repeat('x', 1024));

        $admin = AdminUser::factory()->superAdmin()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/backups')
            ->assertOk();

        $response->assertJsonPath('disk', 'local');
        $response->assertJsonFragment(['path' => 'Intercity/2026-01-01-00-00-00.zip']);
    }

    public function test_admin_can_trigger_a_manual_backup_and_it_is_audit_logged(): void
    {
        Artisan::shouldReceive('call')->once()->with('backup:run')->andReturn(0);
        Artisan::shouldReceive('output')->once()->andReturn("Backup completed!\n");

        $admin = AdminUser::factory()->superAdmin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/backups')
            ->assertOk()
            ->assertJsonPath('output', "Backup completed!\n");

        $this->assertDatabaseHas('audit_logs', ['admin_id' => $admin->id, 'action' => 'backup.run']);
    }

    public function test_accountant_cannot_manage_backups_or_staff(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/backups')->assertForbidden();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/admins')->assertForbidden();
    }

    public function test_super_admin_can_create_and_update_staff_accounts(): void
    {
        $superAdmin = AdminUser::factory()->superAdmin()->create();

        $created = $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/admin/admins', [
                'name' => 'Fatou Ndiaye',
                'email' => 'fatou@intercity.sn',
                'password' => 'password123',
                'role' => AdminUser::ROLE_SUPPORT,
            ])
            ->assertCreated()
            ->assertJsonPath('email', 'fatou@intercity.sn')
            ->assertJsonPath('role', AdminUser::ROLE_SUPPORT)
            ->json();

        $this->assertDatabaseHas('audit_logs', ['admin_id' => $superAdmin->id, 'action' => 'admin.create']);

        $this->actingAs($superAdmin, 'sanctum')
            ->putJson("/api/admin/admins/{$created['id']}", ['status' => 'suspended'])
            ->assertOk()
            ->assertJsonPath('status', 'suspended');

        $this->assertDatabaseHas('audit_logs', ['admin_id' => $superAdmin->id, 'action' => 'admin.update']);
        $this->assertDatabaseHas('admin_users', ['email' => 'fatou@intercity.sn', 'status' => 'suspended']);
    }

    public function test_super_admin_can_view_the_audit_log(): void
    {
        $superAdmin = AdminUser::factory()->superAdmin()->create();
        AuditLog::factory()->create(['admin_id' => $superAdmin->id, 'action' => 'user.status.update', 'description' => 'Test entry']);

        $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/admin/audit-log')
            ->assertOk()
            ->assertJsonFragment(['action' => 'user.status.update']);
    }

    public function test_admin_role_cannot_manage_staff_or_view_audit_log(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ADMIN)->create();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/admins')->assertForbidden();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/audit-log')->assertForbidden();
    }
}
