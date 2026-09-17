<?php

namespace App\Listeners;

use App\Events\DemLeguiDriverArrivedAtPickup;
use App\Models\DemLeguiRequest;
use App\Notifications\DemLeguiDriverArrivedNotification;

class SendDemLeguiDriverArrivedNotifications
{
    public function handle(DemLeguiDriverArrivedAtPickup $event): void
    {
        $trip = $event->trip->loadMissing('driver', 'destinationCity');

        $trip->requests()
            ->where('status', DemLeguiRequest::STATUS_MATCHED)
            ->with('rider')
            ->get()
            ->each(fn (DemLeguiRequest $request) => $request->rider->notify(new DemLeguiDriverArrivedNotification($trip)));
    }
}
