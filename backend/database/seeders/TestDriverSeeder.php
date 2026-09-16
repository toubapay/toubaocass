<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestDriverSeeder extends Seeder
{
    /**
     * Seed a ready-to-use test driver (phone + PIN login, no SMS needed) for
     * manual QA on the live deployment. firstOrCreate so re-running (this
     * runs on every container boot — see docker/entrypoint.sh) never resets
     * the PIN after it's changed.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['phone' => '+221773581420', 'role' => User::ROLE_DRIVER],
            [
                'name' => 'Conducteur Test',
                'phone_verified_at' => now(),
                'pin_hash' => Hash::make('1979'),
                'status' => User::STATUS_ACTIVE,
            ],
        );
    }
}
