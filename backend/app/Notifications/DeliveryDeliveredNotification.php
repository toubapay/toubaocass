<?php

namespace App\Notifications;

use App\Models\Delivery;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the sender once the package has been delivered.
 */
class DeliveryDeliveredNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Delivery $delivery) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class, SmsChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Livraison terminée',
            'body' => "Votre colis a été livré à {$this->delivery->receiver_name}.",
            'data' => [
                'type' => 'delivery_delivered',
                'delivery_id' => $this->delivery->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : votre colis a été livré à {$this->delivery->receiver_name}.";
    }
}
