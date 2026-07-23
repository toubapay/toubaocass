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

        $result = $this->gateway->send($token, $payload['title'], $payload['body'], $payload['data'] ?? []);

        Log::info($result->sent ? 'FCM push sent' : 'FCM push not sent', [
            'notifiable_type' => get_class($notifiable),
            'notifiable_id' => $notifiable->getKey(),
            'notification' => get_class($notification),
        ]);

        // A dead token would otherwise block every future notification to
        // this user with no way to recover short of them manually
        // re-enabling push — clearing it means the next time they open the
        // app, the existing re-registration flow (rider/driver on every
        // launch, web on every page load while permission is granted) picks
        // up a fresh one.
        if ($result->tokenInvalid) {
            $notifiable->update(['fcm_token' => null]);

            Log::info('Cleared invalid FCM token', [
                'notifiable_type' => get_class($notifiable),
                'notifiable_id' => $notifiable->getKey(),
            ]);
        }
    }
}
