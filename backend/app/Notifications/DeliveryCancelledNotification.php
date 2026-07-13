<?php

namespace App\Notifications;

use App\Models\Delivery;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the assigned driver if a sender cancels a delivery already accepted.
 */
class DeliveryCancelledNotification extends Notification
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
            'title' => 'Livraison annulée',
            'body' => "La livraison vers {$this->delivery->receiver_name} a été annulée par l'expéditeur.",
            'data' => [
                'type' => 'delivery_cancelled',
                'delivery_id' => $this->delivery->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : la livraison vers {$this->delivery->receiver_name} a été annulée par l'expéditeur.";
    }
}
