<?php

namespace App\Notifications;

use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OtpCodeNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $code) {}

    public function code(): string
    {
        return $this->code;
    }

    public function via(object $notifiable): array
    {
        return [SmsChannel::class];
    }

    public function toSms(object $notifiable): string
    {
        $ttl = config('services.otp.ttl_minutes');

        return "Votre code de vérification Intercity est {$this->code}. Il expire dans {$ttl} minutes.";
    }
}
