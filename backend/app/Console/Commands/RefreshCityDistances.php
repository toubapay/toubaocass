<?php

namespace App\Console\Commands;

use App\Models\CityDistance;
use App\Services\Geo\CityDistanceService;
use Illuminate\Console\Command;

/**
 * One-off/re-runnable backfill: upgrades cached city-to-city distances that
 * were computed via the Haversine fallback (e.g. before GOOGLE_MAPS_SERVER_KEY
 * was configured) to Google's real driving distance/duration. Distances
 * already sourced from Google are left untouched.
 */
class RefreshCityDistances extends Command
{
    protected $signature = 'city-distances:refresh';

    protected $description = 'Recompute cached city distances that are not yet backed by Google Distance Matrix';

    public function handle(CityDistanceService $service): int
    {
        $stale = CityDistance::where('source', '!=', 'google')->get();

        if ($stale->isEmpty()) {
            $this->info('All cached city distances already use Google Distance Matrix.');

            return self::SUCCESS;
        }

        $updated = 0;
        foreach ($stale as $distance) {
            $service->refresh($distance);

            if ($distance->source === 'google') {
                $updated++;
                $this->line(sprintf(
                    '%s -> %s: %s km (%s min)',
                    $distance->originCity->name,
                    $distance->destinationCity->name,
                    $distance->distance_km,
                    $distance->duration_minutes,
                ));
            }
        }

        $this->info("Refreshed {$updated} of {$stale->count()} cached distances via Google Distance Matrix.");

        if ($updated < $stale->count()) {
            $this->warn('Some pairs could not be upgraded — check GOOGLE_MAPS_SERVER_KEY is set and the Distance Matrix API is enabled, or check logs for details.');
        }

        return self::SUCCESS;
    }
}
