<?php

namespace App\Notifications;

use App\Models\Delivery;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Confirms to the driver that they successfully accepted a delivery —
 * mirrors DeliveryAcceptedNotification (sent to the sender).
 */
class DeliveryAcceptedDriverNotification extends Notification
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
            'title' => 'Livraison acceptée',
            'body' => "Vous avez accepté la livraison. Récupération : {$this->delivery->pickup_address_line}.",
            'data' => [
                'type' => 'delivery_accepted',
                'delivery_id' => $this->delivery->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Vous avez accepté la livraison. Récupération : {$this->delivery->pickup_address_line}.";
    }
}
