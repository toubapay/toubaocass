<?php

namespace App\Listeners;

use App\Events\TripCompleted;
use App\Models\Booking;
use App\Notifications\TripCompletedNotification;

class SendTripCompletedNotifications
{
    public function handle(TripCompleted $event): void
    {
        $trip = $event->trip->loadMissing('originCity', 'destinationCity');

        $trip->bookings()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->with('rider')
            ->get()
            ->each(fn (Booking $booking) => $booking->rider->notify(new TripCompletedNotification($trip)));
    }
}
