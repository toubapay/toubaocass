<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the driver when a rider cancels their booking.
 */
class BookingCancelledNotification extends Notification
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
            'title' => 'Booking cancelled',
            'body' => "A rider cancelled {$this->booking->seats_booked} seat(s) on your {$trip->originCity->name} → {$trip->destinationCity->name} trip.",
            'data' => [
                'type' => 'booking_cancelled',
                'trip_id' => $trip->id,
                'booking_id' => $this->booking->id,
            ],
        ];
    }
}
