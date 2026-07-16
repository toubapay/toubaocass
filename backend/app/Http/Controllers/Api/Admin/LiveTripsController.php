<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Trip;

class LiveTripsController extends Controller
{
    /**
     * Trips currently in progress, for the live-map view. The platform
     * doesn't collect continuous GPS pings from drivers, so the plotted
     * point is each trip's recorded departure location rather than a true
     * real-time position — polled on an interval by the frontend.
     */
    public function index()
    {
        $trips = Trip::query()
            ->with(['driver:id,name,phone', 'car:id,driver_id,make,model,plate_number', 'originCity:id,name', 'destinationCity:id,name'])
            ->where('status', Trip::STATUS_IN_PROGRESS)
            ->whereNotNull('departure_latitude')
            ->whereNotNull('departure_longitude')
            ->get();

        return response()->json([
            'data' => $trips->map(fn (Trip $trip) => [
                'id' => $trip->id,
                'driver_name' => $trip->driver?->name,
                'driver_phone' => $trip->driver?->phone,
                'car' => $trip->car ? trim("{$trip->car->make} {$trip->car->model} ({$trip->car->plate_number})") : null,
                'origin_city' => $trip->originCity?->name,
                'destination_city' => $trip->destinationCity?->name,
                'latitude' => $trip->departure_latitude,
                'longitude' => $trip->departure_longitude,
                'departure_date' => $trip->departure_date,
                'departure_time' => $trip->departure_time,
            ]),
        ]);
    }
}
