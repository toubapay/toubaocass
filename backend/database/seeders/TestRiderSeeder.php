<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestRiderSeeder extends Seeder
{
    /**
     * Seed a ready-to-use test rider (phone + PIN login, no SMS needed) for
     * manual QA on the live deployment. firstOrCreate so re-running (this
     * runs on every container boot — see docker/entrypoint.sh) never resets
     * the PIN after it's changed.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['phone' => '+221755250002', 'role' => User::ROLE_RIDER],
            [
                'name' => 'Utilisateur Test',
                'phone_verified_at' => now(),
                'pin_hash' => Hash::make('1979'),
                'status' => User::STATUS_ACTIVE,
            ],
        );
    }
}
