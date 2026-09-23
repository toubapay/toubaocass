<?php

namespace App\Console\Commands;

use App\Models\DemLeguiRequest;
use App\Models\DemLeguiTrip;
use App\Notifications\DemLeguiEtaUpdateNotification;
use Illuminate\Console\Command;

/**
 * Pushes an updating "driver arriving in X min" notification to every
 * rider whose Dem Légui request is matched to a trip that's still on its
 * way to pickup (status=open, not yet arrived) — this is what makes the
 * ETA visible even with the rider's phone locked or the app killed, since
 * the in-app live tracker (DemLeguiEnRouteTracker) only helps while the
 * app is open. Stops the moment the driver marks arrival or the trip
 * otherwise moves on, so it never sends a stale "arriving" push once
 * they're already there.
 */
class NotifyDemLeguiEta extends Command
{
    protected $signature = 'dem-legui:notify-eta';

    protected $description = "Push an updated arrival ETA to riders whose matched Dem Légui trip is still en route to pickup";

    public function handle(): int
    {
        $trips = DemLeguiTrip::query()
            ->where('status', DemLeguiTrip::STATUS_OPEN)
            ->whereNull('arrived_at')
            ->whereNotNull('driver_id')
            ->with(['driver.driverProfile', 'car', 'requests' => fn ($q) => $q->where('status', DemLeguiRequest::STATUS_MATCHED)->with('rider')])
            ->get();

        $sent = 0;

        foreach ($trips as $trip) {
            foreach ($trip->requests as $request) {
                // etaMinutes() re-derives everything it needs (driver
                // position, this request's own pickup point) from the
                // loaded trip relation — computed per request, since each
                // matched rider on the same trip has their own pickup
                // point and therefore their own distance to the driver.
                $request->setRelation('trip', $trip);
                $etaMinutes = $request->etaMinutes();

                if ($etaMinutes === null) {
                    continue;
                }

                $request->rider?->notify(new DemLeguiEtaUpdateNotification($request, $etaMinutes));
                $sent++;
            }
        }

        $this->info("Sent {$sent} Dem Légui ETA update(s) across {$trips->count()} en-route trip(s).");

        return self::SUCCESS;
    }
}
