<?php

namespace Database\Factories;

use App\Models\Car;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InsurancePolicy>
 */
class InsurancePolicyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'car_id' => Car::factory(),
            'driver_id' => User::factory()->driver(),
            'insurance_provider_id' => InsuranceProvider::factory(),
            'coverage_type' => InsurancePolicy::COVERAGE_TIERS_SIMPLE,
            'plan_name' => 'Formule standard',
            'annual_premium' => fake()->numberBetween(60000, 250000),
            'policy_number' => strtoupper(fake()->unique()->bothify('POL-########')),
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addYear()->toDateString(),
            'status' => InsurancePolicy::STATUS_ACTIVE,
        ];
    }
}
