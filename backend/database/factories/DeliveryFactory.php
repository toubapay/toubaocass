<?php

namespace Database\Factories;

use App\Models\Delivery;
use App\Models\User;
use App\Services\DeliveryPricingService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Delivery>
 */
class DeliveryFactory extends Factory
{
    public function definition(): array
    {
        $pickupLat = fake()->latitude(14.6, 14.8);
        $pickupLng = fake()->longitude(-17.5, -17.3);
        $receiverLat = fake()->latitude(14.6, 14.8);
        $receiverLng = fake()->longitude(-17.5, -17.3);

        $quote = app(DeliveryPricingService::class)->quote(
            (float) $pickupLat,
            (float) $pickupLng,
            (float) $receiverLat,
            (float) $receiverLng,
        );

        return [
            'sender_id' => User::factory(),
            'driver_id' => null,
            'receiver_name' => fake()->name(),
            'receiver_phone' => '+221'.fake()->numerify('7#######'),
            'receiver_address_line' => fake()->streetAddress().', Dakar',
            'receiver_latitude' => $receiverLat,
            'receiver_longitude' => $receiverLng,
            'pickup_address_line' => fake()->streetAddress().', Dakar',
            'pickup_latitude' => $pickupLat,
            'pickup_longitude' => $pickupLng,
            'package_type' => fake()->randomElement([
                Delivery::PACKAGE_TYPE_DOCUMENT,
                Delivery::PACKAGE_TYPE_COLIS_LEGER,
                Delivery::PACKAGE_TYPE_COLIS_MOYEN,
                Delivery::PACKAGE_TYPE_COLIS_VOLUMINEUX,
            ]),
            'notes' => null,
            'distance_km' => $quote['distance_km'],
            'fee' => $quote['fee'],
            'payment_method' => Delivery::PAYMENT_METHOD_CASH,
            'status' => Delivery::STATUS_PENDING,
        ];
    }
}
