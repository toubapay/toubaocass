<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cached city-to-city route distance/duration, computed once per
 * (origin, destination) pair via Google's Distance Matrix API (falling back
 * to a straight-line Haversine estimate when no server key or coordinates
 * are available) and reused thereafter — city distances never change, so
 * there's no reason to call out to Google on every trip listing request.
 */
#[Fillable(['origin_city_id', 'destination_city_id', 'distance_km', 'duration_minutes', 'source'])]
class CityDistance extends Model
{
    protected function casts(): array
    {
        return [
            'distance_km' => 'float',
        ];
    }

    public function originCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'origin_city_id');
    }

    public function destinationCity(): BelongsTo
    {
        return $this->belongsTo(City::class, 'destination_city_id');
    }
}
