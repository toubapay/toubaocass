<?php

namespace App\Notifications;

use App\Models\DemLeguiTrip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to attached riders when the driver starts the Dem Légui trip.
 */
class DemLeguiTripStartedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DemLeguiTrip $trip) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class, SmsChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Trajet démarré',
            'body' => "Votre trajet Dem Légui vers {$this->trip->destinationCity->name} vient de démarrer.",
            'data' => [
                'type' => 'dem_legui_trip_started',
                'dem_legui_trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Votre trajet Dem Légui vers {$this->trip->destinationCity->name} vient de démarrer.";
    }
}
