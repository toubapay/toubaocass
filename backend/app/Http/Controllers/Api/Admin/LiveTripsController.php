<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AnandoRide;
use App\Models\DemLeguiTrip;
use App\Models\Trip;

class LiveTripsController extends Controller
{
    /**
     * Every ride currently in progress, across all three ride types, for
     * the admin live-map view. Plots each one's most recent GPS ping
     * (current_latitude/longitude) when the driver/poster has sent one —
     * is_live tells the frontend whether that's what it's looking at.
     * Scheduled Trips fall back to their recorded departure point when no
     * ping has arrived yet, so a just-started trip still shows up
     * somewhere sensible instead of vanishing from the map; Anando and Dem
     * Légui rides have no fixed departure point to fall back to, so those
     * are only included once a ping exists.
     */
    public function index()
    {
        $trips = Trip::query()
            ->with(['driver:id,name,phone', 'car:id,driver_id,make,model,plate_number', 'originCity:id,name', 'destinationCity:id,name'])
            ->where('status', Trip::STATUS_IN_PROGRESS)
            ->get()
            ->filter(fn (Trip $trip) => ($trip->current_latitude !== null && $trip->current_longitude !== null)
                || ($trip->departure_latitude !== null && $trip->departure_longitude !== null))
            ->map(fn (Trip $trip) => [
                'type' => 'trip',
                'id' => $trip->id,
                'driver_name' => $trip->driver?->name,
                'driver_phone' => $trip->driver?->phone,
                'car' => $trip->car ? trim("{$trip->car->make} {$trip->car->model} ({$trip->car->plate_number})") : null,
                'origin_city' => $trip->originCity?->name,
                'destination_city' => $trip->destinationCity?->name,
                'latitude' => $trip->current_latitude ?? $trip->departure_latitude,
                'longitude' => $trip->current_longitude ?? $trip->departure_longitude,
                'is_live' => $trip->current_latitude !== null,
                'updated_at' => $trip->current_location_updated_at,
            ]);

        $anandoRides = AnandoRide::query()
            ->with(['poster:id,name,phone', 'originCity:id,name', 'destinationCity:id,name'])
            ->where('status', AnandoRide::STATUS_IN_PROGRESS)
            ->whereNotNull('current_latitude')
            ->whereNotNull('current_longitude')
            ->get()
            ->map(fn (AnandoRide $ride) => [
                'type' => 'anando',
                'id' => $ride->id,
                'driver_name' => $ride->poster?->name,
                'driver_phone' => $ride->poster?->phone,
                'car' => null,
                'origin_city' => $ride->originCity?->name,
                'destination_city' => $ride->destinationCity?->name,
                'latitude' => $ride->current_latitude,
                'longitude' => $ride->current_longitude,
                'is_live' => true,
                'updated_at' => $ride->current_location_updated_at,
            ]);

        $demLeguiTrips = DemLeguiTrip::query()
            ->with(['driver:id,name,phone', 'car:id,driver_id,make,model,plate_number', 'destinationCity:id,name'])
            ->where('status', DemLeguiTrip::STATUS_IN_PROGRESS)
            ->whereNotNull('current_latitude')
            ->whereNotNull('current_longitude')
            ->get()
            ->map(fn (DemLeguiTrip $trip) => [
                'type' => 'dem_legui',
                'id' => $trip->id,
                'driver_name' => $trip->driver?->name,
                'driver_phone' => $trip->driver?->phone,
                'car' => $trip->car ? trim("{$trip->car->make} {$trip->car->model} ({$trip->car->plate_number})") : null,
                'origin_city' => null,
                'destination_city' => $trip->destinationCity?->name,
                'latitude' => $trip->current_latitude,
                'longitude' => $trip->current_longitude,
                'is_live' => true,
                'updated_at' => $trip->current_location_updated_at,
            ]);

        return response()->json([
            'data' => $trips->concat($anandoRides)->concat($demLeguiTrips)->values(),
        ]);
    }
}
