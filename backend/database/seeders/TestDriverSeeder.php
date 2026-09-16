<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestDriverSeeder extends Seeder
{
    /**
     * Seed a ready-to-use test driver (phone + PIN login, no SMS needed) for
     * manual QA on the live deployment — pre-approved KYC and an active car
     * so "Passer en ligne" works immediately, not just login. firstOrCreate
     * throughout so re-running (this runs on every container boot — see
     * docker/entrypoint.sh) never resets the PIN or KYC status once changed.
     */
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['phone' => '+221773581420', 'role' => User::ROLE_DRIVER],
            [
                'name' => 'Conducteur Test',
                'phone_verified_at' => now(),
                'pin_hash' => Hash::make('1979'),
                'status' => User::STATUS_ACTIVE,
            ],
        );

        DriverProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'license_number' => 'TEST-1979',
                'kyc_status' => DriverProfile::STATUS_APPROVED,
                'approved_at' => now(),
            ],
        );

        Car::firstOrCreate(
            ['plate_number' => 'DK-1979-TEST'],
            [
                'driver_id' => $user->id,
                'type' => 'sedan',
                'make' => 'Toyota',
                'model' => 'Corolla',
                'seats' => 4,
                'is_active' => true,
            ],
        );
    }
}
