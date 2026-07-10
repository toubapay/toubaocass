<?php

namespace App\Notifications\Channels;

use App\Contracts\PushGateway;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

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
            Log::info('FCM push skipped: notifiable has no fcm_token registered', [
                'notifiable_type' => get_class($notifiable),
                'notifiable_id' => $notifiable->getKey(),
                'notification' => get_class($notification),
            ]);

            return;
        }

        $payload = $notification->toFcm($notifiable);

        $sent = $this->gateway->send($token, $payload['title'], $payload['body'], $payload['data'] ?? []);

        Log::info($sent ? 'FCM push sent' : 'FCM push not sent', [
            'notifiable_type' => get_class($notifiable),
            'notifiable_id' => $notifiable->getKey(),
            'notification' => get_class($notification),
        ]);
    }
}
