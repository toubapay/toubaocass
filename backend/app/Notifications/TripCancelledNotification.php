<?php

namespace App\Notifications;

use App\Models\Trip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to riders with a confirmed booking when the driver cancels the trip.
 */
class TripCancelledNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Trip $trip) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class, SmsChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Trip cancelled',
            'body' => "Your {$this->trip->originCity->name} → {$this->trip->destinationCity->name} trip on {$this->trip->departure_date->format('d/m/Y')} was cancelled by the driver.",
            'data' => [
                'type' => 'trip_cancelled',
                'trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "ToubaCass: Your trip from {$this->trip->originCity->name} to {$this->trip->destinationCity->name} on {$this->trip->departure_date->format('d/m/Y')} was cancelled by the driver. Sorry for the inconvenience.";
    }
}
