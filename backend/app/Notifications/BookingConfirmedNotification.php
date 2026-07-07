<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the rider once their booking is confirmed.
 */
class BookingConfirmedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Booking $booking) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        $trip = $this->booking->trip;

        return [
            'title' => 'Réservation confirmée',
            'body' => "Vous avez réservé {$this->booking->seats_booked} place(s) de {$trip->originCity->name} à {$trip->destinationCity->name} le {$trip->departure_date->format('d/m/Y')} à {$trip->departure_time}.",
            'data' => [
                'type' => 'booking_confirmed',
                'trip_id' => $trip->id,
                'booking_id' => $this->booking->id,
            ],
        ];
    }
}
