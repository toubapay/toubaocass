<?php

namespace App\Notifications;

use App\Models\Delivery;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to nearby online drivers when a rider posts a delivery request —
 * same "geo-filtered broadcast" shape as DemLeguiRequestPostedNotification,
 * so the driver app's delivery badge can refetch instantly instead of
 * waiting for its next poll.
 */
class DeliveryAvailableNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Delivery $delivery) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => '📦 Nouvelle livraison disponible',
            'body' => "Livraison vers {$this->delivery->receiver_name} — {$this->delivery->fee} FCFA.",
            'data' => [
                'type' => 'delivery_available',
                'delivery_id' => $this->delivery->id,
            ],
        ];
    }
}
