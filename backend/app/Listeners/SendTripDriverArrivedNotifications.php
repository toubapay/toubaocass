<?php

namespace App\Listeners;

use App\Events\TripDriverArrived;
use App\Models\Booking;
use App\Notifications\TripDriverArrivedNotification;

class SendTripDriverArrivedNotifications
{
    public function handle(TripDriverArrived $event): void
    {
        $trip = $event->trip->loadMissing('originCity', 'destinationCity');

        $trip->bookings()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->with('rider')
            ->get()
            ->each(fn (Booking $booking) => $booking->rider->notify(new TripDriverArrivedNotification($trip)));
    }
}
