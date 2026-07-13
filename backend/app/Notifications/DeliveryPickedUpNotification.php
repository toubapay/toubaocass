<?php

namespace App\Notifications;

use App\Models\Delivery;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the sender once the driver has picked up the package.
 */
class DeliveryPickedUpNotification extends Notification
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
            'title' => 'Colis récupéré',
            'body' => "Votre colis à destination de {$this->delivery->receiver_name} a été récupéré et est en route.",
            'data' => [
                'type' => 'delivery_picked_up',
                'delivery_id' => $this->delivery->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : votre colis à destination de {$this->delivery->receiver_name} a été récupéré et est en route.";
    }
}
