<?php

namespace App\Notifications;

use App\Models\Trip;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the driver once all seats on their trip are booked.
 */
class TripFullNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Trip $trip) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Trip full',
            'body' => "Your {$this->trip->originCity->name} → {$this->trip->destinationCity->name} trip on {$this->trip->departure_date->format('d/m/Y')} is now fully booked.",
            'data' => [
                'type' => 'trip_full',
                'trip_id' => $this->trip->id,
            ],
        ];
    }
}
