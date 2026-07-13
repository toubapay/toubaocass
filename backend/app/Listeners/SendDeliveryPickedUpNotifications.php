<?php

namespace App\Listeners;

use App\Events\DeliveryPickedUp;
use App\Notifications\DeliveryPickedUpNotification;

class SendDeliveryPickedUpNotifications
{
    public function handle(DeliveryPickedUp $event): void
    {
        $delivery = $event->delivery->loadMissing('sender');

        $delivery->sender->notify(new DeliveryPickedUpNotification($delivery));
    }
}
