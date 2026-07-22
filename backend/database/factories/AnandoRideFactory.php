<?php

namespace Database\Factories;

use App\Models\AnandoRide;
use App\Models\City;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnandoRide>
 */
class AnandoRideFactory extends Factory
{
    public function definition(): array
    {
        $seats = fake()->numberBetween(1, 4);

        return [
            'user_id' => User::factory(),
            'origin_city_id' => City::factory(),
            'destination_city_id' => City::factory(),
            'departure_point' => fake()->streetAddress().', Dakar',
            'departure_at' => now()->addMinutes(fake()->numberBetween(10, 120)),
            'price_per_seat' => fake()->numberBetween(500, 5000),
            'total_seats' => $seats,
            'available_seats' => $seats,
            'vehicle_info' => fake()->boolean() ? fake()->randomElement(['Toyota Corolla', 'Hyundai Accent', 'Peugeot 308']) : null,
            'status' => AnandoRide::STATUS_OPEN,
        ];
    }
}
