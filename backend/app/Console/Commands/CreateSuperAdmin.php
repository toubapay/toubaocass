<?php

namespace App\Console\Commands;

use App\Models\AdminUser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

/**
 * Bootstraps the first super_admin account — there's no open admin
 * registration endpoint, so the initial account is created here by whoever
 * has shell access to the backend. Further staff accounts are then created
 * by a super_admin through the admin app itself (Phase 5).
 */
class CreateSuperAdmin extends Command
{
    protected $signature = 'admin:create-super-admin {email : The new admin\'s email address} {name : The new admin\'s full name}';

    protected $description = 'Create the first super_admin account for the admin back-office';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $name = (string) $this->argument('name');

        $validator = Validator::make(
            ['email' => $email],
            ['email' => ['required', 'email', 'unique:admin_users,email']],
        );

        if ($validator->fails()) {
            $this->error($validator->errors()->first('email'));

            return self::FAILURE;
        }

        $password = $this->secret('Mot de passe (min. 8 caractères)');
        $confirmation = $this->secret('Confirmer le mot de passe');

        if ($password !== $confirmation) {
            $this->error('Les mots de passe ne correspondent pas.');

            return self::FAILURE;
        }

        if (strlen((string) $password) < 8) {
            $this->error('Le mot de passe doit contenir au moins 8 caractères.');

            return self::FAILURE;
        }

        $admin = AdminUser::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => AdminUser::ROLE_SUPER_ADMIN,
            'status' => AdminUser::STATUS_ACTIVE,
        ]);

        $this->info("Compte super_admin créé : {$admin->name} ({$admin->email}).");

        return self::SUCCESS;
    }
}
