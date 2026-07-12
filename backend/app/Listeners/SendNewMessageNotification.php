<?php

namespace App\Listeners;

use App\Events\MessageSent;
use App\Notifications\NewMessageNotification;

class SendNewMessageNotification
{
    public function handle(MessageSent $event): void
    {
        $message = $event->message->loadMissing('sender', 'booking.rider', 'booking.trip.driver');
        $booking = $message->booking;

        $recipient = $message->sender_id === $booking->rider_id
            ? $booking->trip->driver
            : $booking->rider;

        $recipient->notify(new NewMessageNotification($message));
    }
}
