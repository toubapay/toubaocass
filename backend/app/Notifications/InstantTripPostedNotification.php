<?php

namespace App\Notifications;

use App\Models\Trip;
use App\Notifications\Channels\FcmChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Broadcast to riders when a driver posts an "instant" trip (no scheduled
 * date/time — leaving right away). There's no saved-search/geofencing
 * infrastructure yet, so this goes out to every rider with a registered
 * FCM token rather than a route-matched subset.
 */
class InstantTripPostedNotification extends Notification
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
            'title' => '⚡ Départ immédiat',
            'body' => "{$this->trip->originCity->name} → {$this->trip->destinationCity->name} — un chauffeur part maintenant !",
            'data' => [
                'type' => 'instant_trip_posted',
                'trip_id' => $this->trip->id,
            ],
        ];
    }
}
