<?php

namespace Database\Factories;

use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DriverProfile>
 */
class DriverProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->driver(),
            'license_number' => strtoupper(fake()->bothify('LIC-#####')),
            'license_expiry' => fake()->dateTimeBetween('+6 months', '+3 years'),
            'national_id_number' => fake()->numerify('#############'),
            'kyc_status' => DriverProfile::STATUS_APPROVED,
            'approved_at' => now(),
        ];
    }
}
