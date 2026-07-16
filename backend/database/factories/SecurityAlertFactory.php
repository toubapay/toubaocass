<?php

namespace Database\Factories;

use App\Models\SecurityAlert;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SecurityAlert>
 */
class SecurityAlertFactory extends Factory
{
    public function definition(): array
    {
        return [
            'type' => SecurityAlert::TYPE_REPEATED_OTP_FAILURES,
            'severity' => SecurityAlert::SEVERITY_MEDIUM,
            'message' => fake()->sentence(),
            'status' => SecurityAlert::STATUS_OPEN,
        ];
    }
}
