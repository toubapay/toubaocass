<?php

namespace App\Listeners;

use App\Events\InstantTripPosted;
use App\Models\User;
use App\Notifications\InstantTripPostedNotification;
use Illuminate\Support\Facades\Notification;

class SendInstantTripPostedNotifications
{
    public function handle(InstantTripPosted $event): void
    {
        $trip = $event->trip->loadMissing('originCity', 'destinationCity');

        $riders = User::where('role', User::ROLE_RIDER)
            ->whereNotNull('fcm_token')
            ->get();

        if ($riders->isEmpty()) {
            return;
        }

        Notification::send($riders, new InstantTripPostedNotification($trip));
    }
}
