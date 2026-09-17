<?php

namespace App\Listeners;

use App\Events\DeliveryAccepted;
use App\Notifications\DeliveryAcceptedDriverNotification;

class NotifyDriverOfDeliveryAccepted
{
    public function handle(DeliveryAccepted $event): void
    {
        $delivery = $event->delivery->loadMissing('driver');

        $delivery->driver->notify(new DeliveryAcceptedDriverNotification($delivery));
    }
}
