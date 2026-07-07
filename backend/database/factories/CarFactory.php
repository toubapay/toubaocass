<?php

namespace Database\Factories;

use App\Models\Car;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Car>
 */
class CarFactory extends Factory
{
    public function definition(): array
    {
        return [
            'driver_id' => User::factory()->driver(),
            'type' => fake()->randomElement(['sedan', 'suv', 'van', 'minibus']),
            'make' => fake()->randomElement(['Toyota', 'Hyundai', 'Peugeot', 'Renault', 'Kia']),
            'model' => fake()->word(),
            'year' => fake()->numberBetween(2005, 2025),
            'color' => fake()->safeColorName(),
            'plate_number' => strtoupper(fake()->unique()->bothify('DK-####-??')),
            'seats' => fake()->numberBetween(3, 7),
            'is_active' => true,
        ];
    }
}
