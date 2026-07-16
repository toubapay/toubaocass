<?php

namespace Database\Factories;

use App\Models\AdminUser;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'admin_id' => AdminUser::factory(),
            'action' => 'test_action',
            'description' => fake()->sentence(),
        ];
    }
}
