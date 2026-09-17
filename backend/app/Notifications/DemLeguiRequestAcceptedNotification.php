<?php

namespace App\Notifications;

use App\Models\DemLeguiTrip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Confirms to the driver that their acceptance of a Dem Légui request went
 * through — mirrors DemLeguiRequestMatchedNotification (sent to the rider).
 */
class DemLeguiRequestAcceptedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DemLeguiTrip $trip, private readonly int $seatsAdded) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class, SmsChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => 'Demande acceptée',
            'body' => "Vous avez accepté {$this->seatsAdded} place(s) vers {$this->trip->destinationCity->name}.",
            'data' => [
                'type' => 'dem_legui_request_accepted',
                'dem_legui_trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Vous avez accepté {$this->seatsAdded} place(s) vers {$this->trip->destinationCity->name}.";
    }
}
