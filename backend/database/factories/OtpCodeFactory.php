<?php

namespace Database\Factories;

use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<OtpCode>
 */
class OtpCodeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'phone' => '+221'.fake()->unique()->numerify('7#######'),
            'role' => User::ROLE_RIDER,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(5),
            'consumed_at' => null,
        ];
    }
}
