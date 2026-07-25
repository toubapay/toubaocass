<?php

namespace App\Notifications;

use App\Models\DemLeguiTrip;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DemLeguiRequestMatchedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DemLeguiTrip $trip) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => '✅ Conducteur trouvé',
            'body' => "{$this->trip->driver->name} arrive pour votre trajet Dem Légui.",
            'data' => [
                'type' => 'dem_legui_request_matched',
                'dem_legui_trip_id' => $this->trip->id,
            ],
        ];
    }
}
