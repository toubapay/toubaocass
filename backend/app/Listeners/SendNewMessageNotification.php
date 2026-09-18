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
            'anandoRideBooking.user',
            'anandoRideBooking.anandoRide.poster',
            'delivery.sender',
            'delivery.driver',
        );

        $recipient = match (true) {
            $message->booking_id !== null => $message->sender_id === $message->booking->rider_id
                ? $message->booking->trip->driver
                : $message->booking->rider,
            $message->dem_legui_request_id !== null => $message->sender_id === $message->demLeguiRequest->rider_id
                ? $message->demLeguiRequest->trip?->driver
                : $message->demLeguiRequest->rider,
            $message->anando_ride_booking_id !== null => $message->sender_id === $message->anandoRideBooking->user_id
                ? $message->anandoRideBooking->anandoRide->poster
                : $message->anandoRideBooking->user,
            $message->delivery_id !== null => $message->sender_id === $message->delivery->sender_id
                ? $message->delivery->driver
                : $message->delivery->sender,
            default => null,
        };

        $recipient?->notify(new NewMessageNotification($message));
    }
}
