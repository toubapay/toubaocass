<?php

namespace Tests\Feature;

use App\Models\Module;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModuleStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_module_status_is_public_and_reflects_enabled_state(): void
    {
        Module::query()->update(['is_enabled' => true]);
        $anando = Module::where('key', 'anando')->firstOrFail();
        $anando->update(['is_enabled' => false]);

        $response = $this->getJson('/api/modules/status')->assertOk();

        $this->assertFalse($response->json('anando'));
        $this->assertTrue($response->json('livraison'));
    }

    public function test_status_reflects_the_requesting_apps_own_flag(): void
    {
        Module::where('key', 'anando')->update([
            'is_enabled' => true,
            'enabled_for_rider' => true,
            'enabled_for_driver' => false,
        ]);

        $this->getJson('/api/modules/status?app=rider')->assertOk()->assertJsonPath('anando', true);
        $this->getJson('/api/modules/status?app=driver')->assertOk()->assertJsonPath('anando', false);
        // No app given — only the master switch applies, per-app flags ignored.
        $this->getJson('/api/modules/status')->assertOk()->assertJsonPath('anando', true);
    }

    public function test_master_switch_off_overrides_a_true_per_app_flag(): void
    {
        Module::where('key', 'anando')->update([
            'is_enabled' => false,
            'enabled_for_rider' => true,
            'enabled_for_driver' => true,
        ]);

        $this->getJson('/api/modules/status?app=rider')->assertOk()->assertJsonPath('anando', false);
        $this->getJson('/api/modules/status?app=driver')->assertOk()->assertJsonPath('anando', false);
    }
}
