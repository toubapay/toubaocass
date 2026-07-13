<?php

namespace App\Listeners;

use App\Events\DeliveryDelivered;
use App\Notifications\DeliveryDeliveredNotification;

class SendDeliveryDeliveredNotifications
{
    public function handle(DeliveryDelivered $event): void
    {
        $delivery = $event->delivery->loadMissing('sender');

        $delivery->sender->notify(new DeliveryDeliveredNotification($delivery));
    }
}
