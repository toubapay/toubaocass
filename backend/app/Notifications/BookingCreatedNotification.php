<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the driver when a rider books seats on their trip.
 */
class BookingCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Booking $booking) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class, SmsChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        $trip = $this->booking->trip;

        return [
            'title' => 'Nouvelle réservation',
            'body' => "{$this->booking->seats_booked} place(s) réservée(s) sur votre trajet {$trip->originCity->name} → {$trip->destinationCity->name}.",
            'data' => [
                'type' => 'booking_created',
                'trip_id' => $trip->id,
                'booking_id' => $this->booking->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        $trip = $this->booking->trip;

        return "Intercity : {$this->booking->seats_booked} place(s) réservée(s) sur votre trajet {$trip->originCity->name} → {$trip->destinationCity->name} ({$trip->departure_date->format('d/m/Y')} {$trip->departure_time}). {$trip->available_seats} place(s) restante(s).";
    }
}
