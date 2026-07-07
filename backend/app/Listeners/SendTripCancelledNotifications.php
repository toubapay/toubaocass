<?php

namespace App\Listeners;

use App\Events\TripCancelled;
use App\Models\Booking;
use App\Notifications\TripCancelledNotification;

class SendTripCancelledNotifications
{
    public function handle(TripCancelled $event): void
    {
        $trip = $event->trip->loadMissing('originCity', 'destinationCity');

        $trip->bookings()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->with('rider')
            ->get()
            ->each(fn (Booking $booking) => $booking->rider->notify(new TripCancelledNotification($trip)));
    }
}
