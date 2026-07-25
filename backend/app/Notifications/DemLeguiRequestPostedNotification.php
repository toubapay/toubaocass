<?php

namespace App\Notifications;

use App\Models\DemLeguiRequest;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to nearby online drivers when a rider posts a Dem Légui ride
 * request — unlike InstantTripPostedNotification's "blast every rider"
 * shortcut, this is geo-filtered against each driver's last reported
 * position, since that data now exists.
 */
class DemLeguiRequestPostedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DemLeguiRequest $request) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        return [
            'title' => '🚗 Nouvelle demande Dem Légui',
            'body' => "Un passager cherche un trajet vers {$this->request->destinationCity->name}.",
            'data' => [
                'type' => 'dem_legui_request_posted',
                'dem_legui_request_id' => $this->request->id,
            ],
        ];
    }
}
