<?php

namespace App\Notifications;

use App\Models\AnandoRideBooking;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Targeted at the joiner themselves, confirming their booking succeeded —
 * distinct from AnandoRideJoinedNotification, which tells the poster.
 */
class AnandoBookingConfirmedNotification extends Notification
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
            'body' => "Réservation confirmée pour {$ride->originCity->name} → {$ride->destinationCity->name} ({$this->booking->seats_booked} place(s)).",
            'data' => [
                'type' => 'anando_booking_confirmed',
                'anando_ride_id' => $ride->id,
                'anando_ride_booking_id' => $this->booking->id,
            ],
        ];
    }
}
