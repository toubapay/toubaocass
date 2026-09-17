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
            // "Trajet complet" reads like "trip completed" (finished) even
            // though this fires the moment the last seat sells — always
            // before departure. "Toutes les places sont réservées" says
            // exactly what happened without that ambiguity.
            'title' => 'Toutes les places sont réservées',
            'body' => "Votre trajet {$this->trip->originCity->name} → {$this->trip->destinationCity->name} du {$this->trip->departure_date->format('d/m/Y')} est complet.",
            'data' => [
                'type' => 'trip_full',
                'trip_id' => $this->trip->id,
            ],
        ];
    }
}
