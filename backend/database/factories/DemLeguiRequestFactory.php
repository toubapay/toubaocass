<?php

namespace Database\Factories;

use App\Models\City;
use App\Models\DemLeguiRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DemLeguiRequest>
 */
class DemLeguiRequestFactory extends Factory
{
    public function definition(): array
    {
        return [
            'rider_id' => User::factory(),
            'pickup_latitude' => fake()->latitude(14.6, 14.8),
            'pickup_longitude' => fake()->longitude(-17.5, -17.3),
            'pickup_address' => fake()->streetAddress().', Dakar',
            'destination_city_id' => City::factory(),
            'destination_address' => null,
            'seats_requested' => 1,
            'fare_total' => 500,
            'payment_method' => DemLeguiRequest::PAYMENT_METHOD_CASH,
            'status' => DemLeguiRequest::STATUS_PENDING,
        ];
    }
}
