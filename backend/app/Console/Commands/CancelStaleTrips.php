<?php

namespace App\Console\Commands;

use App\Events\TripCancelled;
use App\Models\Booking;
use App\Models\Trip;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * A trip left in "scheduled"/"full" whose departure never actually happened
 * as far as the platform can tell — the driver never started, completed, or
 * cancelled it — is auto-cancelled once more than a day has passed since its
 * scheduled departure. There's no reliable signal at that point that the
 * ride ever took place, so cancelling (with a wallet refund for anyone who
 * prepaid) is the safe default, same reasoning already applied to Anando and
 * Dem Légui's own cancellation flows.
 */
class CancelStaleTrips extends Command
{
    protected $signature = 'trips:cancel-stale';

    protected $description = "Auto-cancel scheduled/full trips more than a day past their departure time that were never started, completed, or cancelled";

    public function handle(WalletService $walletService): int
    {
        $staleTrips = Trip::query()
            ->whereIn('status', [Trip::STATUS_SCHEDULED, Trip::STATUS_FULL])
            ->where('departure_date', '<=', now()->subDay()->toDateString())
            ->get()
            ->filter(fn (Trip $trip) => $trip->departureDateTime()->addDay()->isPast());

        foreach ($staleTrips as $trip) {
            DB::transaction(function () use ($trip, $walletService) {
                $confirmedBookings = $trip->bookings()->where('status', Booking::STATUS_CONFIRMED)->get();

                $trip->update(['status' => Trip::STATUS_CANCELLED]);

                // Dispatched before the bookings flip to cancelled so the
                // notification listener still finds them as "confirmed".
                TripCancelled::dispatch($trip);

                foreach ($confirmedBookings as $booking) {
                    if ($booking->payment_method === Booking::PAYMENT_METHOD_WALLET) {
                        $walletService->credit($booking->rider, $booking->fare_total, $booking, WalletTransaction::TYPE_REFUND, 'Remboursement (trajet expiré, jamais clôturé)');
                        $walletService->debit($trip->driver, $booking->fare_total, $booking, WalletTransaction::TYPE_REFUND_REVERSAL, 'Reprise de revenu (trajet expiré, jamais clôturé)');
                    }
                    $booking->update(['status' => Booking::STATUS_CANCELLED]);
                }
            });
        }

        $this->info("Cancelled {$staleTrips->count()} stale trip(s).");

        return self::SUCCESS;
    }
}
