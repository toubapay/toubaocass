<?php

namespace App\Notifications;

use App\Models\AnandoRide;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Broadcast when a user posts an Anando ride. There's no saved-search or
 * geofencing infrastructure yet, so this goes out to every user (except the
 * poster) with a registered FCM token, mirroring InstantTripPostedNotification.
 */
class AnandoRidePostedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly AnandoRide $anandoRide) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => '🚗 Anando',
            'body' => "{$this->anandoRide->originCity->name} → {$this->anandoRide->destinationCity->name} — une place vient d'être publiée !",
            'data' => [
                'type' => 'anando_ride_posted',
                'anando_ride_id' => $this->anandoRide->id,
            ],
        ];
    }
}
