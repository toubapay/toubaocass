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
    public static function distanceExpression(): string
    {
        return '(6371 * acos(least(1, greatest(-1, '
            .'cos(radians(?)) * cos(radians(departure_latitude)) * cos(radians(departure_longitude) - radians(?))'
            .' + sin(radians(?)) * sin(radians(departure_latitude))'
            .'))))';
    }
}
