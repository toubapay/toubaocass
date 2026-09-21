<?php

namespace App\Console\Commands;

use App\Models\DemLeguiRequest;
use Illuminate\Console\Command;

/**
 * A Dem Légui request no driver has accepted within
 * DemLeguiRequest::ACTIVE_WINDOW_MINUTES auto-expires — it stops cluttering
 * the driver-facing nearby list and frees the rider to post a new request,
 * mirroring anando:terminate-stale. Matched requests (already tied to a
 * trip) are untouched — they're not "still searching" and expiring them
 * would strand a driver already en route.
 */
class ExpireStaleDemLeguiRequests extends Command
{
    protected $signature = 'dem-legui:expire-stale-requests';

    protected $description = 'Expire Dem Légui requests still pending more than '.DemLeguiRequest::ACTIVE_WINDOW_MINUTES.' minutes after being posted';

    public function handle(): int
    {
        $staleRequests = DemLeguiRequest::query()
            ->where('status', DemLeguiRequest::STATUS_PENDING)
            ->where('created_at', '<=', now()->subMinutes(DemLeguiRequest::ACTIVE_WINDOW_MINUTES))
            ->get();

        foreach ($staleRequests as $request) {
            $request->update(['status' => DemLeguiRequest::STATUS_EXPIRED]);
        }

        $this->info("Expired {$staleRequests->count()} stale Dem Légui request(s).");

        return self::SUCCESS;
    }
}
