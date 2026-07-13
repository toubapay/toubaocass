<?php

namespace App\Listeners;

use App\Events\DeliveryAccepted;
use App\Notifications\DeliveryAcceptedNotification;

class SendDeliveryAcceptedNotifications
{
    public function handle(DeliveryAccepted $event): void
    {
        $delivery = $event->delivery->loadMissing('sender', 'driver');

        $delivery->sender->notify(new DeliveryAcceptedNotification($delivery));
    }
}
