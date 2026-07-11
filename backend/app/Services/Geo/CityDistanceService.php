<?php

namespace App\Services\Geo;

use App\Models\City;
use App\Models\CityDistance;
use App\Support\Geo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Resolves the route distance/duration between two cities, preferring
 * Google's Distance Matrix API (real driving distance) and falling back to
 * a straight-line Haversine estimate when no server key or coordinates are
 * configured. Results are cached in the city_distances table — a city pair's
 * distance never changes, so there's no reason to call out to Google (or
 * even recompute Haversine) more than once per pair, ever.
 */
class CityDistanceService
{
    /** @var array<string, CityDistance> per-instance memo, avoids duplicate lookups within one request */
    private array $memo = [];

    public function between(City $origin, City $destination): CityDistance
    {
        $key = "{$origin->id}:{$destination->id}";
        if (isset($this->memo[$key])) {
            return $this->memo[$key];
        }

        $existing = CityDistance::where('origin_city_id', $origin->id)
            ->where('destination_city_id', $destination->id)
            ->first();

        if ($existing) {
            return $this->memo[$key] = $existing;
        }

        $computed = $this->computeViaGoogle($origin, $destination) ?? $this->computeViaHaversine($origin, $destination);

        $record = CityDistance::create([
            'origin_city_id' => $origin->id,
            'destination_city_id' => $destination->id,
            ...$computed,
        ]);

        return $this->memo[$key] = $record;
    }

    /**
     * Re-attempts a Google lookup for a distance that was previously cached
     * via the Haversine fallback (e.g. computed before a server key was
     * configured) and upgrades it in place if Google now returns a result.
     * No-op for distances already sourced from Google.
     */
    public function refresh(CityDistance $distance): CityDistance
    {
        if ($distance->source === 'google') {
            return $distance;
        }

        $computed = $this->computeViaGoogle($distance->originCity, $distance->destinationCity);

        if ($computed) {
            $distance->update($computed);
        }

        return $distance;
    }

    /**
     * @return array{distance_km: float, duration_minutes: int|null, source: string}|null
     */
    private function computeViaGoogle(City $origin, City $destination): ?array
    {
        $apiKey = config('services.google_maps.server_key');
        if (! $apiKey || $origin->latitude === null || $destination->latitude === null) {
            return null;
        }

        try {
            $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
                'origins' => "{$origin->latitude},{$origin->longitude}",
                'destinations' => "{$destination->latitude},{$destination->longitude}",
                'mode' => 'driving',
                'key' => $apiKey,
            ]);

            $element = $response->json('rows.0.elements.0');

            if (! $response->successful() || ($element['status'] ?? null) !== 'OK') {
                Log::warning('Google Distance Matrix lookup returned no usable result, falling back to Haversine', [
                    'origin_city_id' => $origin->id,
                    'destination_city_id' => $destination->id,
                    'status' => $element['status'] ?? $response->status(),
                ]);

                return null;
            }

            return [
                'distance_km' => round($element['distance']['value'] / 1000, 1),
                'duration_minutes' => (int) round($element['duration']['value'] / 60),
                'source' => 'google',
            ];
        } catch (Throwable $e) {
            Log::warning('Google Distance Matrix lookup failed, falling back to Haversine', [
                'origin_city_id' => $origin->id,
                'destination_city_id' => $destination->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @return array{distance_km: float, duration_minutes: int|null, source: string}
     */
    private function computeViaHaversine(City $origin, City $destination): array
    {
        if ($origin->latitude === null || $destination->latitude === null) {
            return ['distance_km' => null, 'duration_minutes' => null, 'source' => 'unavailable'];
        }

        $distanceKm = Geo::haversineKm(
            $origin->latitude, $origin->longitude,
            $destination->latitude, $destination->longitude,
        );

        return [
            'distance_km' => round($distanceKm, 1),
            // Rough estimate assuming an average 60 km/h door-to-door pace —
            // only used when Google's real driving duration isn't available.
            'duration_minutes' => (int) round($distanceKm),
            'source' => 'haversine',
        ];
    }
}
