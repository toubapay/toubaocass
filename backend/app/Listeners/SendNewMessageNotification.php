<?php

namespace App\Listeners;

use App\Events\MessageSent;
use App\Notifications\NewMessageNotification;

class SendNewMessageNotification
{
    public function handle(MessageSent $event): void
    {
        $message = $event->message->loadMissing(
            'sender',
            'booking.rider',
            'booking.trip.driver',
            'demLeguiRequest.rider',
            'demLeguiRequest.trip.driver',
        );

        if ($message->booking_id) {
            $booking = $message->booking;

            $recipient = $message->sender_id === $booking->rider_id
                ? $booking->trip->driver
                : $booking->rider;

            $recipient->notify(new NewMessageNotification($message));

            return;
        }

        $demLeguiRequest = $message->demLeguiRequest;

        $recipient = $message->sender_id === $demLeguiRequest->rider_id
            ? $demLeguiRequest->trip?->driver
            : $demLeguiRequest->rider;

        $recipient?->notify(new NewMessageNotification($message));
    }
}
