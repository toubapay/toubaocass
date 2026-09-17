<?php

namespace App\Listeners;

use App\Events\DemLeguiRequestMatched;
use App\Notifications\DemLeguiRequestAcceptedNotification;

class NotifyDriverOfDemLeguiMatch
{
    public function handle(DemLeguiRequestMatched $event): void
    {
        $request = $event->request->loadMissing('trip.driver', 'trip.destinationCity');

        if (! $request->trip) {
            return;
        }

        $request->trip->driver->notify(new DemLeguiRequestAcceptedNotification($request->trip, $request->seats_requested));
    }
}
