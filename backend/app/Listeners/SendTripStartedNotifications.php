<?php

namespace App\Listeners;

use App\Events\TripStarted;
use App\Models\Booking;
use App\Notifications\TripStartedNotification;

class SendTripStartedNotifications
{
    public function handle(TripStarted $event): void
    {
        $trip = $event->trip->loadMissing('originCity', 'destinationCity');

        $trip->bookings()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->with('rider')
            ->get()
            ->each(fn (Booking $booking) => $booking->rider->notify(new TripStartedNotification($trip)));
    }
}
