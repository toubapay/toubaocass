<?php

namespace Database\Factories;

use App\Models\Car;
use App\Models\City;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Trip>
 */
class TripFactory extends Factory
{
    public function definition(): array
    {
        $seats = fake()->numberBetween(3, 7);

        return [
            'driver_id' => User::factory()->driver(),
            'car_id' => Car::factory(),
            'origin_city_id' => City::factory(),
            'destination_city_id' => City::factory(),
            'departure_date' => fake()->dateTimeBetween('+1 day', '+2 weeks')->format('Y-m-d'),
            'departure_time' => fake()->time('H:i'),
            'fare' => fake()->numberBetween(2000, 15000),
            'ride_type' => fake()->randomElement(['standard', 'comfort', 'xl']),
            'total_seats' => $seats,
            'available_seats' => $seats,
            'status' => Trip::STATUS_SCHEDULED,
        ];
    }
}
