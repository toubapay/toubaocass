<?php

namespace App\Notifications;

use App\Models\AnandoRideBooking;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Targeted at the ride's poster when someone joins a seat.
 */
class AnandoRideJoinedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly AnandoRideBooking $booking) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        $ride = $this->booking->anandoRide;

        return [
            'title' => '🚗 Anando',
            'body' => "{$this->booking->user->name} a rejoint votre trajet {$ride->originCity->name} → {$ride->destinationCity->name}.",
            'data' => [
                'type' => 'anando_ride_joined',
                'anando_ride_id' => $ride->id,
                'anando_ride_booking_id' => $this->booking->id,
            ],
        ];
    }
}
