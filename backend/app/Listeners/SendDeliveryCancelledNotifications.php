<?php

namespace App\Listeners;

use App\Events\DeliveryCancelled;
use App\Notifications\DeliveryCancelledNotification;

class SendDeliveryCancelledNotifications
{
    public function handle(DeliveryCancelled $event): void
    {
        $delivery = $event->delivery->loadMissing('driver');

        $delivery->driver?->notify(new DeliveryCancelledNotification($delivery));
    }
}
