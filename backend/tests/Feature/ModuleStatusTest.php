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
}
