<?php

namespace App\Listeners;

use App\Events\AnandoRidePosted;
use App\Models\User;
use App\Notifications\AnandoRidePostedNotification;
use Illuminate\Support\Facades\Notification;

class SendAnandoRidePostedNotifications
{
    public function handle(AnandoRidePosted $event): void
    {
        $ride = $event->anandoRide->loadMissing('originCity', 'destinationCity');

        $recipients = User::where('id', '!=', $ride->user_id)
            ->whereNotNull('fcm_token')
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new AnandoRidePostedNotification($ride));
    }
}
