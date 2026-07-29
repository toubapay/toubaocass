<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnandoRide;
use App\Models\DemLeguiTrip;
use App\Models\Trip;
use Illuminate\Http\Request;

/**
 * Public, unauthenticated endpoint behind the SOS "share my live position"
 * link — deliberately exposes the bare minimum: who's travelling, the
 * route, and their current reported position, nothing that identifies
 * anyone beyond a first look (no phone numbers, no full booking history).
 * Only ever returns a position while the ride is actually in_progress, the
 * same one instant where a share link is meaningful.
 */
class TrackingController extends Controller
{
    public function show(Request $request, string $type, int $id)
    {
        $ride = match ($type) {
            'trip' => Trip::with(['driver', 'originCity', 'destinationCity'])->find($id),
            'anando' => AnandoRide::with(['poster', 'originCity', 'destinationCity'])->find($id),
            'dem-legui' => DemLeguiTrip::with(['driver', 'destinationCity'])->find($id),
            default => null,
        };

        if (! $ride) {
            return response()->json(['message' => 'Trajet introuvable.'], 404);
        }

        $isInProgress = match ($type) {
            'trip' => $ride->status === Trip::STATUS_IN_PROGRESS,
            'anando' => $ride->status === AnandoRide::STATUS_IN_PROGRESS,
            'dem-legui' => $ride->status === DemLeguiTrip::STATUS_IN_PROGRESS,
        };

        if (! $isInProgress) {
            return response()->json([
                'trackable' => false,
                'person_name' => null,
                'origin_city' => null,
                'destination_city' => null,
                'current_latitude' => null,
                'current_longitude' => null,
                'current_location_updated_at' => null,
            ]);
        }

        $personName = $type === 'anando' ? $ride->poster->name : $ride->driver->name;
        $originCity = $type === 'dem-legui' ? null : $ride->originCity?->name;

        return response()->json([
            'trackable' => true,
            'person_name' => $personName,
            'origin_city' => $originCity,
            'destination_city' => $ride->destinationCity?->name,
            'current_latitude' => $ride->current_latitude,
            'current_longitude' => $ride->current_longitude,
            'current_location_updated_at' => $ride->current_location_updated_at,
        ]);
    }
}
