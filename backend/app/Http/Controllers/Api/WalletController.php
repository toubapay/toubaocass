<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WalletResource;
use App\Services\WalletService;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function show(Request $request, WalletService $walletService)
    {
        $wallet = $walletService->getOrCreate($request->user());

        // Wallets are lazily auto-created on first access — without an
        // explicit status here, Laravel's JsonResource would return 201 on
        // that first request, which is confusing for what's semantically a
        // read-only GET from the client's point of view.
        return (new WalletResource($wallet->load(['transactions' => fn ($q) => $q->latest()->limit(50)])))
            ->response()->setStatusCode(200);
    }
}
