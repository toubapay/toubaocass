<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Trip;
use App\Services\CommissionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * A trip left in "scheduled"/"full" whose departure was more than a day ago
 * almost certainly happened — drivers routinely forget to tap
 * start/complete in the app — so it's auto-closed as completed rather than
 * cancelled, the same way TripController::complete() closes out a trip the
 * driver finishes by hand: commission gets applied to each confirmed
 * booking and no wallet movement happens (a wallet-paid fare was already
 * charged to the rider and credited to the driver at booking time; assuming
 * the ride happened means that stands, it doesn't get reversed).
 */
class FinishStaleTrips extends Command
{
    protected $signature = 'trips:finish-stale';

    protected $description = "Auto-complete scheduled/full trips more than a day past their departure time that were never started, completed, or cancelled";

    public function handle(CommissionService $commissionService): int
    {
        $staleTrips = Trip::query()
            ->whereIn('status', [Trip::STATUS_SCHEDULED, Trip::STATUS_FULL])
            ->where('departure_date', '<=', now()->subDay()->toDateString())
            ->get()
            ->filter(fn (Trip $trip) => $trip->departureDateTime()->addDay()->isPast());

        foreach ($staleTrips as $trip) {
            DB::transaction(function () use ($trip, $commissionService) {
                $trip->update(['status' => Trip::STATUS_COMPLETED]);

                $trip->bookings()->where('status', Booking::STATUS_CONFIRMED)->get()->each(
                    fn (Booking $booking) => $commissionService->applyToBooking($booking),
                );
            });
        }

        $this->info("Finished {$staleTrips->count()} stale trip(s).");

        return self::SUCCESS;
    }
}
