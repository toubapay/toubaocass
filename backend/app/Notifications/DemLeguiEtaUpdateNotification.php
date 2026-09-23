<?php

namespace App\Notifications;

use App\Models\DemLeguiRequest;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent on a short interval (see dem-legui:notify-eta) while a matched
 * driver is on the way to pickup, so the rider sees an updating "arriving
 * in X min" notification even with the phone locked or the app killed —
 * FCM/no-SMS only, and marked os_display so the OS shows/replaces it
 * itself without the app needing to be running (see PushGateway's own
 * doc comment). Deliberately not sent once the driver has arrived
 * (arrived_at set) or the trip has otherwise moved on — see the command.
 */
class DemLeguiEtaUpdateNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly DemLeguiRequest $request, private readonly int $etaMinutes) {}

    public function via(object $notifiable): array
    {
        return [FcmChannel::class];
    }

    public function toFcm(object $notifiable): array
    {
        $trip = $this->request->trip;

        return [
            'title' => $trip?->car ? "{$trip->car->make} {$trip->car->model} · {$trip->car->plate_number}" : 'Votre chauffeur arrive',
            'body' => "Arrivée dans {$this->etaMinutes} min",
            'data' => [
                'type' => 'dem_legui_eta_update',
                'dem_legui_request_id' => $this->request->id,
                'eta_minutes' => $this->etaMinutes,
            ],
            // Same tag for every update on this one request — each new
            // send replaces the previous notification instead of stacking
            // a fresh one every minute.
            'os_display' => ['tag' => "dem_legui_eta_{$this->request->id}"],
        ];
    }
}
