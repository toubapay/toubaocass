<?php

namespace App\Listeners;

use App\Events\DemLeguiRequestPosted;
use App\Models\DemLeguiRequest;
use App\Models\DriverProfile;
use App\Notifications\DemLeguiRequestPostedNotification;
use App\Support\Geo;
use Illuminate\Support\Facades\Notification;

class NotifyNearbyOnlineDriversOfDemLeguiRequest
{
    public function handle(DemLeguiRequestPosted $event): void
    {
        $request = $event->request->loadMissing('destinationCity');

        $profiles = DriverProfile::query()
            ->where('is_online', true)
            ->whereNotNull('current_latitude')
            ->whereRaw(Geo::distanceExpression('current_latitude', 'current_longitude').' <= ?', [
                $request->pickup_latitude, $request->pickup_longitude, $request->pickup_latitude,
                DemLeguiRequest::NEARBY_RADIUS_KM,
            ])
            ->with('user')
            ->get();

        $drivers = $profiles->pluck('user')->filter(fn ($user) => $user && $user->fcm_token);

        if ($drivers->isEmpty()) {
            return;
        }

        Notification::send($drivers, new DemLeguiRequestPostedNotification($request));
    }
}
