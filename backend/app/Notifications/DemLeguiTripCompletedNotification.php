<?php

namespace App\Notifications;

use App\Models\DemLeguiTrip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to attached riders when the driver marks the Dem Légui trip
 * completed.
 */
class DemLeguiTripCompletedNotification extends Notification
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
            'title' => 'Trajet terminé',
            'body' => "Votre trajet Dem Légui vers {$this->trip->destinationCity->name} est terminé. Merci d'avoir voyagé avec Intercity !",
            'data' => [
                'type' => 'dem_legui_trip_completed',
                'dem_legui_trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Votre trajet Dem Légui vers {$this->trip->destinationCity->name} est terminé. Merci d'avoir voyagé avec nous !";
    }
}
