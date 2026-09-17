<?php

namespace App\Listeners;

use App\Events\DemLeguiRequestCancelledAfterMatch;
use App\Notifications\DemLeguiRequestCancelledNotification;

class SendDemLeguiRequestCancelledNotifications
{
    public function handle(DemLeguiRequestCancelledAfterMatch $event): void
    {
        $request = $event->request->loadMissing('trip.driver', 'destinationCity');

        if (! $request->trip) {
            return;
        }

        $request->trip->driver->notify(new DemLeguiRequestCancelledNotification($request));
    }
}
