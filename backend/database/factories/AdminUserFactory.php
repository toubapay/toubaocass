<?php

namespace Database\Factories;

use App\Models\AdminUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<AdminUser>
 */
class AdminUserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => AdminUser::ROLE_ADMIN,
            'status' => AdminUser::STATUS_ACTIVE,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => AdminUser::ROLE_SUPER_ADMIN]);
    }

    public function role(string $role): static
    {
        return $this->state(fn (array $attributes) => ['role' => $role]);
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => ['status' => AdminUser::STATUS_SUSPENDED]);
    }
}
