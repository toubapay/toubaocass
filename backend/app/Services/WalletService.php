<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * In-app wallet used to pay for bookings instead of cash. Riders top up
 * (manually for now — no real payment gateway) and pay from their balance;
 * drivers get credited "earnings" for bookings paid this way, since no cash
 * changes hands between them. All balance changes are logged as
 * WalletTransaction rows so the balance is always reconstructable/auditable.
 */
class WalletService
{
    public function getOrCreate(User $user): Wallet
    {
        return Wallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);
    }

    public function topUp(User $user, int $amount, string $description = 'Rechargement du portefeuille'): Wallet
    {
        return DB::transaction(function () use ($user, $amount, $description) {
            $wallet = Wallet::where('user_id', $user->id)->lockForUpdate()->first()
                ?? Wallet::create(['user_id' => $user->id, 'balance' => 0]);

            $wallet->increment('balance', $amount);
            $wallet->transactions()->create([
                'type' => WalletTransaction::TYPE_TOP_UP,
                'amount' => $amount,
                'description' => $description,
            ]);

            return $wallet->fresh();
        });
    }

    /**
     * Debits the user's wallet. Throws a ValidationException if the balance
     * is insufficient — callers should run this inside their own DB
     * transaction alongside whatever it's paying for.
     */
    public function charge(User $user, int $amount, ?Booking $booking, string $description): Wallet
    {
        $wallet = Wallet::where('user_id', $user->id)->lockForUpdate()->first()
            ?? Wallet::create(['user_id' => $user->id, 'balance' => 0]);

        if ($wallet->balance < $amount) {
            throw ValidationException::withMessages([
                'payment_method' => ['Solde du portefeuille insuffisant pour ce paiement.'],
            ]);
        }

        $wallet->decrement('balance', $amount);
        $wallet->transactions()->create([
            'type' => WalletTransaction::TYPE_PAYMENT,
            'amount' => -$amount,
            'booking_id' => $booking?->id,
            'description' => $description,
        ]);

        return $wallet->fresh();
    }

    public function credit(User $user, int $amount, ?Booking $booking, string $type, string $description): Wallet
    {
        $wallet = Wallet::where('user_id', $user->id)->lockForUpdate()->first()
            ?? Wallet::create(['user_id' => $user->id, 'balance' => 0]);

        $wallet->increment('balance', $amount);
        $wallet->transactions()->create([
            'type' => $type,
            'amount' => $amount,
            'booking_id' => $booking?->id,
            'description' => $description,
        ]);

        return $wallet->fresh();
    }

    /**
     * Reverses an earning credit (e.g. a driver's payout for a booking that
     * got cancelled). Allows the balance to go negative if the driver
     * already spent/withdrew it conceptually — this is a ledger of record,
     * not a hard constraint, since driver payouts aren't withdrawable cash
     * in this version.
     */
    public function debit(User $user, int $amount, ?Booking $booking, string $type, string $description): Wallet
    {
        $wallet = Wallet::where('user_id', $user->id)->lockForUpdate()->first()
            ?? Wallet::create(['user_id' => $user->id, 'balance' => 0]);

        $wallet->decrement('balance', $amount);
        $wallet->transactions()->create([
            'type' => $type,
            'amount' => -$amount,
            'booking_id' => $booking?->id,
            'description' => $description,
        ]);

        return $wallet->fresh();
    }
}
