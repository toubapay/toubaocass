<?php

namespace App\Listeners;

use App\Events\BookingCreated;
use App\Models\Trip;
use App\Notifications\BookingConfirmedNotification;
use App\Notifications\BookingCreatedNotification;
use App\Notifications\TripFullNotification;

class SendBookingCreatedNotifications
{
    public function handle(BookingCreated $event): void
    {
        $booking = $event->booking->loadMissing('trip.originCity', 'trip.destinationCity', 'trip.driver', 'rider');
        $trip = $booking->trip;

        $trip->driver->notify(new BookingCreatedNotification($booking));
        $booking->rider->notify(new BookingConfirmedNotification($booking));

        if ($trip->status === Trip::STATUS_FULL) {
            $trip->driver->notify(new TripFullNotification($trip));
        }
    }
}
