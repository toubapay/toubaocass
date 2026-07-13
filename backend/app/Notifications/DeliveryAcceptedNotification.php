<?php

namespace App\Notifications;

use App\Models\Delivery;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the sender when a driver accepts their delivery request.
 */
class DeliveryAcceptedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Delivery $delivery) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class, SmsChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        $driver = $this->delivery->driver;

        return [
            'title' => 'Livraison acceptée',
            'body' => "{$driver->name} a accepté votre livraison et va récupérer le colis. Tél : {$driver->phone}.",
            'data' => [
                'type' => 'delivery_accepted',
                'delivery_id' => $this->delivery->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        $driver = $this->delivery->driver;

        return "Intercity : {$driver->name} a accepté votre livraison ({$driver->phone}) et va récupérer le colis.";
    }
}
