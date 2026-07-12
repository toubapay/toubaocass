<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Address>
 */
class AddressFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'label' => fake()->randomElement(['Domicile', 'Travail', 'Autre']),
            'address_line' => fake()->streetAddress().', Dakar',
            'latitude' => fake()->latitude(14.6, 14.8),
            'longitude' => fake()->longitude(-17.5, -17.3),
            'is_default' => false,
        ];
    }
}
