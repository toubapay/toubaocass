<?php

namespace App\Console\Commands;

use App\Models\AnandoRide;
use Illuminate\Console\Command;

/**
 * Unlike a scheduled Trip (anchored to a departure instant), an Anando ride
 * has no fixed end time — it's only ever "active" for
 * AnandoRide::ACTIVE_WINDOW_HOURS after the poster created it. A ride the
 * poster never explicitly started/completed/cancelled is auto-terminated
 * (marked completed) once that window passes, so it stops cluttering the
 * "available" browse listing and the Home screen mini-list, and stops
 * blocking the poster from posting a new one under the one-active-ride-at-a-
 * time rule.
 */
class TerminateStaleAnandoRides extends Command
{
    protected $signature = 'anando:terminate-stale';

    protected $description = 'Auto-complete Anando rides more than '.AnandoRide::ACTIVE_WINDOW_HOURS.' hours past posting that were never completed or cancelled';

    public function handle(): int
    {
        $staleRides = AnandoRide::query()
            ->active()
            ->where('created_at', '<=', now()->subHours(AnandoRide::ACTIVE_WINDOW_HOURS))
            ->get();

        foreach ($staleRides as $ride) {
            $ride->update(['status' => AnandoRide::STATUS_COMPLETED, 'completed_at' => now()]);
        }

        $this->info("Terminated {$staleRides->count()} stale Anando ride(s).");

        return self::SUCCESS;
    }
}
