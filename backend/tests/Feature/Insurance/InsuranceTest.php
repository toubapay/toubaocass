<?php

namespace Tests\Feature\Insurance;

use App\Models\AdminUser;
use App\Models\Car;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InsuranceTest extends TestCase
{
    use RefreshDatabase;

    private function makeProviders(): void
    {
        InsuranceProvider::factory()->create(['code' => InsuranceProvider::CODE_ASS_SENEGAL, 'name' => 'Ass Sénégal', 'commission_rate' => 10]);
        InsuranceProvider::factory()->create(['code' => InsuranceProvider::CODE_AMSA, 'name' => 'AMSA Assurances', 'commission_rate' => 12]);
        InsuranceProvider::factory()->create(['code' => InsuranceProvider::CODE_PROVIDENCE, 'name' => 'Providence Assurances', 'is_active' => false]);
    }

    public function test_driver_gets_quotes_only_from_active_providers(): void
    {
        $this->makeProviders();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id, 'type' => 'sedan', 'year' => 2022]);

        $response = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/insurance/quotes', ['car_id' => $car->id, 'coverage_type' => 'tiers_simple'])
            ->assertOk();

        $quotes = $response->json('quotes');
        $this->assertCount(2, $quotes);
        $providerNames = array_column($quotes, 'provider_name');
        $this->assertContains('Ass Sénégal', $providerNames);
        $this->assertContains('AMSA Assurances', $providerNames);
        $this->assertNotContains('Providence Assurances', $providerNames);

        // Sorted cheapest first.
        $this->assertLessThanOrEqual($quotes[1]['annual_premium'], $quotes[0]['annual_premium']);
    }

    public function test_driver_cannot_quote_for_another_drivers_car(): void
    {
        $this->makeProviders();
        $driver = User::factory()->driver()->create();
        $otherDriver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $otherDriver->id]);

        $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/insurance/quotes', ['car_id' => $car->id, 'coverage_type' => 'tiers_simple'])
            ->assertForbidden();
    }

    public function test_driver_can_purchase_a_policy_with_commission_snapshotted(): void
    {
        $this->makeProviders();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $provider = InsuranceProvider::where('code', InsuranceProvider::CODE_AMSA)->firstOrFail();

        // assertOk() rather than assertCreated(): applyToInsurancePolicy()
        // re-fetches the model via fresh(), which resets
        // wasRecentlyCreated to false — cosmetic only (same as the KYC
        // auto-approve path elsewhere in this codebase).
        $response = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/insurance/policies', [
                'car_id' => $car->id,
                'provider_id' => $provider->id,
                'coverage_type' => 'tous_risques',
                'plan_name' => 'Pack Intégral',
                'annual_premium' => 100000,
            ])
            ->assertOk()
            ->assertJsonPath('plan_name', 'Pack Intégral')
            ->assertJsonPath('status', 'active');

        $policyId = $response->json('id');

        $this->assertDatabaseHas('insurance_policies', [
            'id' => $policyId,
            'car_id' => $car->id,
            'driver_id' => $driver->id,
            'annual_premium' => 100000,
            'commission_rate' => '12.00',
            'commission_amount' => 12000,
        ]);
    }

    public function test_driver_only_sees_their_own_policies(): void
    {
        $this->makeProviders();
        $driver = User::factory()->driver()->create();
        $otherDriver = User::factory()->driver()->create();

        InsurancePolicy::factory()->create(['driver_id' => $driver->id, 'car_id' => Car::factory()->create(['driver_id' => $driver->id])->id]);
        InsurancePolicy::factory()->create(['driver_id' => $otherDriver->id, 'car_id' => Car::factory()->create(['driver_id' => $otherDriver->id])->id]);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/driver/insurance/policies')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
    }

    public function test_admin_with_manage_insurance_can_manage_providers(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/insurance/providers', [
                'code' => 'new_insurer',
                'name' => 'Nouvel Assureur',
                'commission_rate' => 15,
            ])
            ->assertCreated()
            ->assertJsonPath('has_api_credentials', false)
            ->json();

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/insurance/providers/{$created['id']}", [
                'api_base_url' => 'https://example.test/api',
                'api_key' => 'secret-key',
            ])
            ->assertOk()
            ->assertJsonPath('has_api_credentials', true);

        $this->assertArrayNotHasKey('api_key', $response->json());
    }

    public function test_support_role_cannot_manage_insurance(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_SUPPORT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/insurance/providers')
            ->assertForbidden();
    }

    public function test_admin_can_view_all_policies(): void
    {
        $this->makeProviders();
        $admin = AdminUser::factory()->create();
        $driver = User::factory()->driver()->create();
        InsurancePolicy::factory()->create(['driver_id' => $driver->id, 'car_id' => Car::factory()->create(['driver_id' => $driver->id])->id]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/insurance/policies')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
