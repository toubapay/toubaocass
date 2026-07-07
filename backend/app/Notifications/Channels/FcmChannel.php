<?php

namespace App\Notifications\Channels;

use App\Contracts\PushGateway;
use Illuminate\Notifications\Notification;

class FcmChannel
{
    public function __construct(private readonly PushGateway $gateway) {}

    public function send(mixed $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toFcm')) {
            return;
        }

        $token = $notifiable->routeNotificationFor('fcm', $notification);

        if (! $token) {
            return;
        }

        $payload = $notification->toFcm($notifiable);

        $this->gateway->send($token, $payload['title'], $payload['body'], $payload['data'] ?? []);
    }
}
