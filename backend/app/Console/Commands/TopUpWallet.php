<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\WalletService;
use Illuminate\Console\Command;

/**
 * Admin-only wallet top-up — there's no self-service top-up in the app (no
 * real payment gateway wired up yet), so crediting a user's wallet is done
 * here, by whoever runs the app's backend (e.g. after receiving cash from
 * the user in person, or a manual mobile-money transfer).
 */
class TopUpWallet extends Command
{
    protected $signature = 'wallet:top-up {phone : The user\'s phone number, e.g. +221781112233} {amount : Amount in FCFA} {--description=Rechargement du portefeuille}';

    protected $description = "Credit a user's wallet (admin-only — there is no self-service top-up)";

    public function handle(WalletService $walletService): int
    {
        $phone = $this->argument('phone');
        $amount = (int) $this->argument('amount');

        if ($amount <= 0) {
            $this->error('Le montant doit être supérieur à 0.');

            return self::FAILURE;
        }

        $user = User::where('phone', $phone)->first();

        if (! $user) {
            $this->error("Aucun utilisateur trouvé avec le numéro {$phone}.");

            return self::FAILURE;
        }

        $wallet = $walletService->topUp($user, $amount, (string) $this->option('description'));

        $this->info("Portefeuille de {$user->name} ({$user->phone}) crédité de {$amount} FCFA. Nouveau solde : {$wallet->balance} FCFA.");

        return self::SUCCESS;
    }
}
