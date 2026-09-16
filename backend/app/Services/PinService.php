<?php

namespace App\Services;

use App\Models\SecurityAlert;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PinService
{
    public function __construct(private readonly SecurityAlertService $securityAlerts) {}

    public function setPin(User $user, string $pin): void
    {
        $user->update([
            'pin_hash' => Hash::make($pin),
            'pin_failed_attempts' => 0,
            'pin_locked_until' => null,
        ]);
    }

    public function loginWithPin(string $phone, string $role, string $pin): User
    {
        $user = User::where('phone', $phone)->where('role', $role)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'pin' => ['Numéro ou code PIN incorrect.'],
            ]);
        }

        if (! $user->hasPin()) {
            throw ValidationException::withMessages([
                'pin' => ["Aucun code PIN n'est configuré pour ce compte. Utilisez « Créer un compte » pour vous connecter par SMS."],
            ]);
        }

        if ($user->isPinLocked()) {
            throw ValidationException::withMessages([
                'pin' => ['Trop de tentatives échouées. Réessayez dans quelques minutes.'],
            ]);
        }

        if (! Hash::check($pin, $user->pin_hash)) {
            $user->increment('pin_failed_attempts');

            if ($user->pin_failed_attempts >= (int) config('services.pin.max_attempts')) {
                $user->update([
                    'pin_locked_until' => now()->addMinutes((int) config('services.pin.lockout_minutes')),
                ]);

                $this->securityAlerts->record(
                    SecurityAlert::TYPE_REPEATED_PIN_FAILURES,
                    SecurityAlert::SEVERITY_MEDIUM,
                    "Échecs répétés du code PIN pour le numéro {$phone}.",
                    $user,
                    ['phone' => $phone, 'role' => $role, 'attempts' => $user->pin_failed_attempts],
                );
            }

            throw ValidationException::withMessages([
                'pin' => ['Code PIN incorrect.'],
            ]);
        }

        if ($user->pin_failed_attempts > 0) {
            $user->update(['pin_failed_attempts' => 0]);
        }

        return $user;
    }
}
