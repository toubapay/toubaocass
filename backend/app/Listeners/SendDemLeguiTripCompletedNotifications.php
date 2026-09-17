<?php

namespace App\Listeners;

use App\Events\DemLeguiTripCompleted;
use App\Models\DemLeguiRequest;
use App\Notifications\DemLeguiTripCompletedNotification;

class SendDemLeguiTripCompletedNotifications
{
    public function handle(DemLeguiTripCompleted $event): void
    {
        $trip = $event->trip->loadMissing('destinationCity');

        $trip->requests()
            ->where('status', DemLeguiRequest::STATUS_MATCHED)
            ->with('rider')
            ->get()
            ->each(fn (DemLeguiRequest $request) => $request->rider->notify(new DemLeguiTripCompletedNotification($trip)));
    }
}
