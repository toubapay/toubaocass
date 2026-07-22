<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModuleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_the_seeded_default_modules(): void
    {
        $admin = AdminUser::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/modules')
            ->assertOk();

        $keys = collect($response->json('data'))->pluck('key');
        $this->assertTrue($keys->contains('anando'));
        $this->assertTrue($keys->contains('livraison'));
        $this->assertTrue($keys->contains('assurance'));
        $this->assertTrue($keys->contains('instant_trips'));
    }

    public function test_role_without_manage_modules_permission_is_forbidden(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_SUPERVISEUR)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/modules')
            ->assertForbidden();
    }

    public function test_admin_can_create_a_new_module(): void
    {
        $admin = AdminUser::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/modules', [
                'key' => 'colis_express',
                'name' => 'Colis Express',
                'description' => 'Livraison express en moins de 2h.',
                'category' => 'service',
                'config' => ['max_distance_km' => 15],
            ])
            ->assertCreated();

        $response->assertJsonPath('key', 'colis_express')
            ->assertJsonPath('is_enabled', true)
            ->assertJsonPath('config.max_distance_km', 15);

        $this->assertDatabaseHas('modules', ['key' => 'colis_express', 'name' => 'Colis Express']);
    }

    public function test_module_key_must_be_unique(): void
    {
        $admin = AdminUser::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/modules', ['key' => 'anando', 'name' => 'Doublon'])
            ->assertUnprocessable();
    }

    public function test_admin_can_update_module_details(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'cargaison')->first();

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}", [
                'name' => 'Cargaison Pro',
                'config' => ['max_weight_kg' => 5000],
            ])
            ->assertOk();

        $response->assertJsonPath('name', 'Cargaison Pro')
            ->assertJsonPath('key', 'cargaison')
            ->assertJsonPath('config.max_weight_kg', 5000);
    }

    public function test_module_key_cannot_be_changed_via_update(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'cargaison')->first();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}", ['key' => 'hacked_key'])
            ->assertUnprocessable();
    }

    public function test_admin_can_disable_and_reenable_a_module(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'camion')->first();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => false])
            ->assertOk()
            ->assertJsonPath('is_enabled', false);

        $this->assertDatabaseHas('modules', ['key' => 'camion', 'is_enabled' => false]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => true])
            ->assertOk()
            ->assertJsonPath('is_enabled', true);
    }

    public function test_admin_can_delete_a_module(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'location')->first();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/modules/{$module->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('modules', ['id' => $module->id]);
    }

    public function test_disabling_anando_module_blocks_posting_a_ride_and_reenabling_restores_it(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'anando')->first();
        $rider = User::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => false])
            ->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->postJson('/api/anando-rides', [])
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => true])
            ->assertOk();

        // Now blocked only by validation (422), not the module gate (403) —
        // proves the module check itself was lifted.
        $this->actingAs($rider, 'sanctum')
            ->postJson('/api/anando-rides', [])
            ->assertUnprocessable();
    }

    public function test_disabling_livraison_module_blocks_creating_a_delivery(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'livraison')->first();
        $rider = User::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => false])
            ->assertOk();

        $this->actingAs($rider, 'sanctum')
            ->postJson('/api/deliveries', [])
            ->assertForbidden();
    }

    public function test_disabling_instant_trips_module_blocks_posting_an_instant_trip(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'instant_trips')->first();
        $driver = User::factory()->driver()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => false])
            ->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/trips/instant', [])
            ->assertForbidden();
    }

    public function test_disabling_assurance_module_blocks_purchasing_a_policy(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'assurance')->first();
        $driver = User::factory()->driver()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => false])
            ->assertOk();

        $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/insurance/policies', [])
            ->assertForbidden();
    }

    public function test_deleting_a_module_fails_open_and_stops_gating_its_route(): void
    {
        $admin = AdminUser::factory()->create();
        $module = Module::where('key', 'anando')->first();
        $rider = User::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/modules/{$module->id}/status", ['is_enabled' => false])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/modules/{$module->id}")
            ->assertNoContent();

        // The module row is gone entirely — an unknown key fails OPEN, so
        // the route is no longer gated at all (422 from validation, not 403).
        $this->actingAs($rider, 'sanctum')
            ->postJson('/api/anando-rides', [])
            ->assertUnprocessable();
    }
}
