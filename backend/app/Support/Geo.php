<?php

namespace App\Support;

class Geo
{
    /**
     * Raw SQL for the great-circle distance (km) between a given point and
     * each trip's departure coordinates, via the Haversine formula. Works on
     * any SQL database with acos/cos/sin/radians (no PostGIS/earthdistance
     * extension required) so it stays portable across environments.
     *
     * Bindings must be supplied in this order wherever the expression is
     * used: [$lat, $lng, $lat].
     */
    public static function distanceExpression(string $latColumn = 'departure_latitude', string $lngColumn = 'departure_longitude'): string
    {
        return '(6371 * acos(least(1, greatest(-1, '
            ."cos(radians(?)) * cos(radians({$latColumn})) * cos(radians({$lngColumn}) - radians(?))"
            ." + sin(radians(?)) * sin(radians({$latColumn}))"
            .'))))';
    }

    /**
     * Plain-PHP great-circle distance (km) between two points, for one-off
     * calculations outside a query builder context (e.g. caching a
     * city-to-city distance rather than filtering a table by it).
     */
    public static function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371;

        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($lngDelta / 2) ** 2;

        return $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
