<?php

namespace App\Services;

use App\Models\OtpCode;
use App\Models\SecurityAlert;
use App\Models\User;
use App\Notifications\OtpCodeNotification;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class OtpService
{
    public function __construct(private readonly SecurityAlertService $securityAlerts) {}

    public function requestOtp(string $phone, string $role): OtpCode
    {
        $code = $this->generateCode();

        $otp = OtpCode::create([
            'phone' => $phone,
            'role' => $role,
            'code' => Hash::make($code),
            'expires_at' => now()->addMinutes((int) config('services.otp.ttl_minutes')),
        ]);

        (new AnonymousNotifiable)
            ->route('sms', $phone)
            ->notify(new OtpCodeNotification($code));

        return $otp;
    }

    /**
     * @return array{user: User, is_new: bool}
     */
    public function verifyOtp(string $phone, string $role, string $code): array
    {
        $otp = OtpCode::where('phone', $phone)
            ->where('role', $role)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $otp || $otp->isExpired()) {
            throw ValidationException::withMessages([
                'code' => ['This code has expired. Please request a new one.'],
            ]);
        }

        if ($otp->attempts >= (int) config('services.otp.max_attempts')) {
            throw ValidationException::withMessages([
                'code' => ['Too many attempts. Please request a new code.'],
            ]);
        }

        $bypass = config('services.otp.bypass_code');
        $isValid = ($bypass && $code === $bypass) || Hash::check($code, $otp->code);

        if (! $isValid) {
            $otp->increment('attempts');

            if ($otp->attempts >= (int) config('services.otp.max_attempts')) {
                $this->securityAlerts->record(
                    SecurityAlert::TYPE_REPEATED_OTP_FAILURES,
                    SecurityAlert::SEVERITY_MEDIUM,
                    "Échecs répétés du code OTP pour le numéro {$phone}.",
                    User::where('phone', $phone)->where('role', $role)->first(),
                    ['phone' => $phone, 'role' => $role, 'attempts' => $otp->attempts],
                );
            }

            throw ValidationException::withMessages([
                'code' => ['The code you entered is incorrect.'],
            ]);
        }

        $otp->update(['consumed_at' => now()]);

        $user = User::where('phone', $phone)->where('role', $role)->first();
        $isNew = $user === null;

        if (! $user) {
            $user = User::create([
                'phone' => $phone,
                'role' => $role,
                'phone_verified_at' => now(),
            ]);
        } elseif (! $user->phone_verified_at) {
            $user->update(['phone_verified_at' => now()]);
        }

        return ['user' => $user, 'is_new' => $isNew];
    }

    private function generateCode(): string
    {
        $length = (int) config('services.otp.length');

        return (string) random_int(
            (int) str_pad('1', $length, '0'),
            (int) str_pad('', $length, '9')
        );
    }
}
