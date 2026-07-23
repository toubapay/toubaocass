<?php

namespace App\Listeners;

use App\Events\AnandoRideJoined;
use App\Notifications\AnandoBookingConfirmedNotification;

/**
 * Second listener on the same AnandoRideJoined event as
 * SendAnandoRideJoinedNotifications — that one tells the poster someone
 * joined, this one confirms the booking to the joiner themselves.
 */
class SendAnandoBookingConfirmedNotification
{
    public function handle(AnandoRideJoined $event): void
    {
        $joiner = $event->booking->user;

        if (! $joiner->fcm_token) {
            return;
        }

        $joiner->notify(new AnandoBookingConfirmedNotification($event->booking));
    }
}
