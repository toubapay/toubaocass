<?php

namespace App\Listeners;

use App\Events\AnandoRideJoined;
use App\Notifications\AnandoRideJoinedNotification;

class SendAnandoRideJoinedNotifications
{
    public function handle(AnandoRideJoined $event): void
    {
        $poster = $event->booking->anandoRide->poster;

        if (! $poster->fcm_token) {
            return;
        }

        $poster->notify(new AnandoRideJoinedNotification($event->booking));
    }
}
