<?php

namespace App\Notifications\Channels;

use App\Contracts\SmsGateway;
use Illuminate\Notifications\Notification;

class SmsChannel
{
    public function __construct(private readonly SmsGateway $gateway) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSms')) {
            return;
        }

        $phone = $notifiable->routeNotificationFor('sms', $notification);

        if (! $phone) {
            return;
        }

        $message = $notification->toSms($notifiable);

        $this->gateway->send($phone, $message);
    }
}
