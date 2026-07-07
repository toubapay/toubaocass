<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'trip_id' => Trip::factory(),
            'rider_id' => User::factory(),
            'seats_booked' => 1,
            'fare_total' => fake()->numberBetween(2000, 15000),
            'status' => Booking::STATUS_CONFIRMED,
        ];
    }
}
