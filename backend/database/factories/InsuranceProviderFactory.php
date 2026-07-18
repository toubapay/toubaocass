<?php

namespace Database\Factories;

use App\Models\InsuranceProvider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InsuranceProvider>
 */
class InsuranceProviderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->slug(2),
            'name' => fake()->company(),
            'commission_rate' => 10.00,
            'is_active' => true,
        ];
    }
}
