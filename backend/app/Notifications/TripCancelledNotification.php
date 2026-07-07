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
            'title' => 'Trajet annulé',
            'body' => "Votre trajet {$this->trip->originCity->name} → {$this->trip->destinationCity->name} du {$this->trip->departure_date->format('d/m/Y')} a été annulé par le conducteur.",
            'data' => [
                'type' => 'trip_cancelled',
                'trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Votre trajet de {$this->trip->originCity->name} à {$this->trip->destinationCity->name} du {$this->trip->departure_date->format('d/m/Y')} a été annulé par le conducteur. Désolé pour la gêne occasionnée.";
    }
}
