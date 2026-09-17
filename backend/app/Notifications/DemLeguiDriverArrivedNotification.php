<?php

namespace App\Notifications;

use App\Models\DemLeguiTrip;
use App\Notifications\Channels\FcmChannel;
use App\Notifications\Channels\SmsChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to attached riders when the driver marks having reached the pickup
 * point.
 */
class DemLeguiDriverArrivedNotification extends Notification
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
            'title' => 'Le conducteur est arrivé',
            'body' => "{$this->trip->driver->name} est arrivé au point de prise en charge.",
            'data' => [
                'type' => 'dem_legui_driver_arrived',
                'dem_legui_trip_id' => $this->trip->id,
            ],
        ];
    }

    public function toSms(object $notifiable): string
    {
        return "Intercity : {$this->trip->driver->name} est arrivé au point de prise en charge.";
    }
}
