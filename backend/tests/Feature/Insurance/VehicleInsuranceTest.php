<?php

namespace Tests\Feature\Insurance;

use App\Models\Car;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class VehicleInsuranceTest extends TestCase
{
    use RefreshDatabase;

    private function makeProviders(): void
    {
        InsuranceProvider::factory()->create(['code' => InsuranceProvider::CODE_ASS_SENEGAL, 'name' => 'Ass Sénégal', 'commission_rate' => 10]);
        InsuranceProvider::factory()->create(['code' => InsuranceProvider::CODE_AMSA, 'name' => 'AMSA Assurances', 'commission_rate' => 12]);
    }

    public function test_a_rider_can_scan_a_carte_grise_and_get_extracted_vehicle_info(): void
    {
        $rider = User::factory()->create();

        $response = $this->actingAs($rider, 'sanctum')
            ->post('/api/insurance/vehicles/scan', [
                'carte_grise_front' => UploadedFile::fake()->image('front.jpg'),
                'carte_grise_back' => UploadedFile::fake()->image('back.jpg'),
            ])
            ->assertOk();

        $response->assertJsonStructure(['make', 'model', 'plate_number', 'power_cv', 'seats', 'vehicle_age_bracket', 'carte_grise_front_path', 'carte_grise_back_path']);
        $this->assertNotNull($response->json('carte_grise_front_path'));
        $this->assertNotNull($response->json('carte_grise_back_path'));
    }

    public function test_scanning_the_back_is_optional(): void
    {
        $rider = User::factory()->create();

        $this->actingAs($rider, 'sanctum')
            ->post('/api/insurance/vehicles/scan', [
                'carte_grise_front' => UploadedFile::fake()->image('front.jpg'),
            ])
            ->assertOk()
            ->assertJsonPath('carte_grise_back_path', null);
    }

    public function test_a_rider_can_get_vehicle_quotes_without_owning_a_car(): void
    {
        $this->makeProviders();
        $rider = User::factory()->create();

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/insurance/vehicles/quotes', [
                'vehicle_category' => 'car',
                'vehicle_power_cv' => 5,
                'vehicle_seats' => 5,
                'vehicle_age_bracket' => 'under_5',
                'vehicle_usage_type' => 'personal',
                'coverage_type' => 'tiers_simple',
            ])
            ->assertOk();

        $this->assertCount(2, $response->json('quotes'));
    }

    public function test_motorcycle_and_professional_use_change_the_premium(): void
    {
        $this->makeProviders();
        $rider = User::factory()->create();

        $carQuote = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/insurance/vehicles/quotes', [
                'vehicle_category' => 'car',
                'vehicle_power_cv' => 5,
                'vehicle_age_bracket' => 'under_5',
                'vehicle_usage_type' => 'personal',
                'coverage_type' => 'tiers_simple',
            ])
            ->json('quotes.0.annual_premium');

        $motoQuote = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/insurance/vehicles/quotes', [
                'vehicle_category' => 'motorcycle',
                'vehicle_power_cv' => 5,
                'vehicle_age_bracket' => 'under_5',
                'vehicle_usage_type' => 'personal',
                'coverage_type' => 'tiers_simple',
            ])
            ->json('quotes.0.annual_premium');

        $professionalQuote = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/insurance/vehicles/quotes', [
                'vehicle_category' => 'car',
                'vehicle_power_cv' => 5,
                'vehicle_age_bracket' => 'under_5',
                'vehicle_usage_type' => 'professional',
                'coverage_type' => 'tiers_simple',
            ])
            ->json('quotes.0.annual_premium');

        $this->assertLessThan($carQuote, $motoQuote);
        $this->assertGreaterThan($carQuote, $professionalQuote);
    }

    public function test_a_rider_can_purchase_a_vehicle_policy_with_no_car_id_and_commission_applied(): void
    {
        $this->makeProviders();
        $rider = User::factory()->create();
        $provider = InsuranceProvider::where('code', InsuranceProvider::CODE_AMSA)->firstOrFail();

        $response = $this->actingAs($rider, 'sanctum')
            ->postJson('/api/insurance/vehicles/policies', [
                'vehicle_category' => 'motorcycle',
                'make' => 'Yamaha',
                'model' => 'XTZ',
                'plate_number' => 'DK-1234-AB',
                'vehicle_power_cv' => 4,
                'vehicle_age_bracket' => 'from_5_to_10',
                'vehicle_usage_type' => 'personal',
                'carte_grise_front_path' => 'insurance-documents/1/front.jpg',
                'provider_id' => $provider->id,
                'coverage_type' => 'tiers_simple',
                'plan_name' => 'Pack Moto',
                'annual_premium' => 30000,
            ])
            ->assertOk()
            ->assertJsonPath('plan_name', 'Pack Moto');

        $policyId = $response->json('id');

        $this->assertDatabaseHas('insurance_policies', [
            'id' => $policyId,
            'car_id' => null,
            'driver_id' => $rider->id,
            'vehicle_category' => 'motorcycle',
            'vehicle_make' => 'Yamaha',
            'commission_rate' => '12.00',
        ]);
    }

    public function test_disabling_the_assurance_module_blocks_vehicle_policy_purchase(): void
    {
        $this->makeProviders();
        $rider = User::factory()->create();
        $provider = InsuranceProvider::first();
        Module::where('key', 'assurance')->update(['is_enabled' => false]);

        $this->actingAs($rider, 'sanctum')
            ->postJson('/api/insurance/vehicles/policies', [
                'vehicle_category' => 'car',
                'vehicle_age_bracket' => 'under_5',
                'vehicle_usage_type' => 'personal',
                'provider_id' => $provider->id,
                'coverage_type' => 'tiers_simple',
                'plan_name' => 'Pack',
                'annual_premium' => 30000,
            ])
            ->assertForbidden();
    }

    public function test_my_policies_lists_both_car_based_and_vehicle_based_policies_together(): void
    {
        $this->makeProviders();
        $driver = User::factory()->driver()->create();
        $car = Car::factory()->create(['driver_id' => $driver->id]);
        $provider = InsuranceProvider::first();

        InsurancePolicy::factory()->create(['driver_id' => $driver->id, 'car_id' => $car->id]);
        InsurancePolicy::factory()->create([
            'driver_id' => $driver->id,
            'car_id' => null,
            'vehicle_category' => 'motorcycle',
            'vehicle_make' => 'Honda',
            'insurance_provider_id' => $provider->id,
        ]);

        $response = $this->actingAs($driver, 'sanctum')
            ->getJson('/api/insurance/my-policies')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
    }
}
