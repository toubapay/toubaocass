<?php

namespace App\Notifications;

use App\Models\Trip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to riders with a confirmed booking when the driver marks having
 * reached the meeting point.
 */
class TripDriverArrivedNotification extends Notification
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
            'title' => 'Le conducteur est arrivé',
            'body' => "Votre conducteur est arrivé au point de rendez-vous pour le trajet {$this->trip->originCity->name} → {$this->trip->destinationCity->name}.",
            'data' => [
                'type' => 'trip_driver_arrived',
                'trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Votre conducteur est arrivé au point de rendez-vous ({$this->trip->originCity->name} → {$this->trip->destinationCity->name}).";
    }
}
