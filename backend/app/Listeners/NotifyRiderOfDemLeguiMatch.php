<?php

namespace App\Listeners;

use App\Events\DemLeguiRequestMatched;
use App\Notifications\DemLeguiRequestMatchedNotification;

class NotifyRiderOfDemLeguiMatch
{
    public function handle(DemLeguiRequestMatched $event): void
    {
        $request = $event->request->loadMissing('trip.driver', 'rider');

        if (! $request->trip || ! $request->rider->fcm_token) {
            return;
        }

        $request->rider->notify(new DemLeguiRequestMatchedNotification($request->trip));
    }
}
