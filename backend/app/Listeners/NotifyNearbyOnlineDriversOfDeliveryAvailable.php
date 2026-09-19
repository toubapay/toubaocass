<?php

namespace App\Listeners;

use App\Events\DeliveryRequested;
use App\Models\Delivery;
use App\Models\DriverProfile;
use App\Notifications\DeliveryAvailableNotification;
use App\Support\Geo;
use Illuminate\Support\Facades\Notification;

class NotifyNearbyOnlineDriversOfDeliveryAvailable
{
    public function handle(DeliveryRequested $event): void
    {
        $delivery = $event->delivery;

        $profiles = DriverProfile::query()
            ->where('is_online', true)
            ->whereNotNull('current_latitude')
            ->whereRaw(Geo::distanceExpression('current_latitude', 'current_longitude').' <= ?', [
                $delivery->pickup_latitude, $delivery->pickup_longitude, $delivery->pickup_latitude,
                Delivery::NEARBY_RADIUS_KM,
            ])
            ->with('user')
            ->get();

        $drivers = $profiles->pluck('user')->filter(fn ($user) => $user && $user->fcm_token);

        if ($drivers->isEmpty()) {
            return;
        }

        Notification::send($drivers, new DeliveryAvailableNotification($delivery));
    }
}
