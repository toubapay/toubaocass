<?php

namespace App\Listeners;

use App\Events\AnandoRideJoined;
use App\Notifications\AnandoRideJoinedNotification;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendAnandoRideJoinedNotifications
{
    public function handle(AnandoRideJoined $event): void
    {
        $poster = $event->booking->anandoRide->poster;

        if (! $poster->fcm_token) {
            return;
        }

        try {
            $poster->notify(new AnandoRideJoinedNotification($event->booking));
        } catch (Throwable $e) {
            // Isolated from SendAnandoBookingConfirmedNotification, the
            // other listener on this same event — both run synchronously in
            // the same request, so an uncaught exception here would also
            // prevent the joiner's own confirmation from being sent.
            Log::error('Failed to notify Anando ride poster of a new booking', [
                'anando_ride_booking_id' => $event->booking->id,
                'poster_id' => $poster->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
