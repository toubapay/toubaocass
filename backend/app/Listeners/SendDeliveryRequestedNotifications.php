<?php

namespace App\Listeners;

use App\Events\DeliveryRequested;
use App\Notifications\DeliveryRequestedNotification;

class SendDeliveryRequestedNotifications
{
    public function handle(DeliveryRequested $event): void
    {
        $delivery = $event->delivery->loadMissing('sender');

        $delivery->sender->notify(new DeliveryRequestedNotification($delivery));
    }
}
