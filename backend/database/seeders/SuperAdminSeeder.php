<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Seed the platform's initial super admin. firstOrCreate so re-running
     * (this runs on every container boot — see docker/entrypoint.sh) never
     * resets the password after the account holder changes it.
     */
    public function run(): void
    {
        AdminUser::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('saynabou'),
                'role' => AdminUser::ROLE_SUPER_ADMIN,
                'status' => AdminUser::STATUS_ACTIVE,
            ],
        );
    }
}
