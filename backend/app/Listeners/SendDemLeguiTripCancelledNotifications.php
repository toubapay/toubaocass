<?php

namespace App\Listeners;

use App\Events\DemLeguiTripCancelled;
use App\Models\DemLeguiRequest;
use App\Notifications\DemLeguiTripCancelledNotification;

class SendDemLeguiTripCancelledNotifications
{
    public function handle(DemLeguiTripCancelled $event): void
    {
        $trip = $event->trip->loadMissing('driver', 'destinationCity');

        $trip->driver->notify(new DemLeguiTripCancelledNotification($trip));

        $event->cancelledRequests->each(
            fn (DemLeguiRequest $attachedRequest) => $attachedRequest->rider->notify(new DemLeguiTripCancelledNotification($trip)),
        );
    }
}
