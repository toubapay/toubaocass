<?php

namespace App\Listeners;

use App\Events\DemLeguiTripStarted;
use App\Models\DemLeguiRequest;
use App\Notifications\DemLeguiTripStartedNotification;

class SendDemLeguiTripStartedNotifications
{
    public function handle(DemLeguiTripStarted $event): void
    {
        $trip = $event->trip->loadMissing('destinationCity');

        $trip->requests()
            ->where('status', DemLeguiRequest::STATUS_MATCHED)
            ->with('rider')
            ->get()
            ->each(fn (DemLeguiRequest $request) => $request->rider->notify(new DemLeguiTripStartedNotification($trip)));
    }
}
