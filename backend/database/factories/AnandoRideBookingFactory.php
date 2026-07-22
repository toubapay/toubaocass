<?php

namespace Database\Factories;

use App\Models\AnandoRide;
use App\Models\AnandoRideBooking;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AnandoRideBooking>
 */
class AnandoRideBookingFactory extends Factory
{
    public function definition(): array
    {
        $seats = 1;

        return [
            'anando_ride_id' => AnandoRide::factory(),
            'user_id' => User::factory(),
            'seats_booked' => $seats,
            'price_total' => fake()->numberBetween(500, 5000) * $seats,
            'payment_method' => AnandoRideBooking::PAYMENT_METHOD_CASH,
            'status' => AnandoRideBooking::STATUS_CONFIRMED,
        ];
    }
}
