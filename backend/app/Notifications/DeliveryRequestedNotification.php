<?php

namespace App\Notifications;

use App\Models\Delivery;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the sender once their delivery request is registered.
 */
class DeliveryRequestedNotification extends Notification
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
            'title' => 'Demande de livraison enregistrée',
            'body' => "Votre demande de livraison vers {$this->delivery->receiver_name} a été enregistrée. Frais estimés : {$this->delivery->fee} FCFA.",
            'data' => [
                'type' => 'delivery_requested',
                'delivery_id' => $this->delivery->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : votre demande de livraison vers {$this->delivery->receiver_name} a été enregistrée. Frais estimés : {$this->delivery->fee} FCFA.";
    }
}
