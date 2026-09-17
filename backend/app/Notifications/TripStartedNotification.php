<?php

namespace App\Notifications;

use App\Models\Trip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to riders with a confirmed booking when the driver starts the trip.
 */
class TripStartedNotification extends Notification
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
            'title' => 'Trajet démarré',
            'body' => "Votre trajet {$this->trip->originCity->name} → {$this->trip->destinationCity->name} vient de démarrer.",
            'data' => [
                'type' => 'trip_started',
                'trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Votre trajet de {$this->trip->originCity->name} à {$this->trip->destinationCity->name} vient de démarrer.";
    }
}
