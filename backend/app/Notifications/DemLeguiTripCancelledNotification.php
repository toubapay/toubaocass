<?php

namespace App\Notifications;

use App\Models\DemLeguiTrip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the driver and every matched rider when an admin cancels a whole
 * Dem Légui trip from the back-office — distinct from
 * DemLeguiRequestCancelledNotification, which is worded for a rider having
 * cancelled their own request and would misattribute the cancellation here.
 */
class DemLeguiTripCancelledNotification extends Notification
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
            'title' => 'Trajet Dem Légui annulé',
            'body' => "Le trajet Dem Légui vers {$this->trip->destinationCity->name} a été annulé.",
            'data' => [
                'type' => 'dem_legui_trip_cancelled',
                'dem_legui_trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : Le trajet Dem Légui vers {$this->trip->destinationCity->name} a été annulé. Désolé pour la gêne occasionnée.";
    }
}
