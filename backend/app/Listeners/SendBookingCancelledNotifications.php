<?php

namespace App\Listeners;

use App\Events\BookingCancelled;
use App\Notifications\BookingCancelledNotification;

class SendBookingCancelledNotifications
{
    public function handle(BookingCancelled $event): void
    {
        $booking = $event->booking->loadMissing('trip.originCity', 'trip.destinationCity', 'trip.driver');

        $booking->trip->driver->notify(new BookingCancelledNotification($booking));
    }
}
