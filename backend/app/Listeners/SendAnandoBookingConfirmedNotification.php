<?php

namespace App\Listeners;

use App\Events\AnandoRideJoined;
use App\Notifications\AnandoBookingConfirmedNotification;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Second listener on the same AnandoRideJoined event as
 * SendAnandoRideJoinedNotifications — that one tells the poster someone
 * joined, this one confirms the booking to the joiner themselves.
 */
class SendAnandoBookingConfirmedNotification
{
    public function handle(AnandoRideJoined $event): void
    {
        $joiner = $event->booking->user;

        if (! $joiner->fcm_token) {
            return;
        }

        try {
            $joiner->notify(new AnandoBookingConfirmedNotification($event->booking));
        } catch (Throwable $e) {
            // Isolated from SendAnandoRideJoinedNotifications, the other
            // listener on this same event — both run synchronously in the
            // same request, so an uncaught exception here would also
            // prevent the poster from being told someone joined.
            Log::error('Failed to send Anando booking confirmation to joiner', [
                'anando_ride_booking_id' => $event->booking->id,
                'joiner_id' => $joiner->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
