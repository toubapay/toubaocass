<?php

namespace App\Services\Insurance;

use App\Contracts\InsuranceProviderClient;
use App\Models\InsuranceProvider;
use RuntimeException;

class InsuranceProviderClientFactory
{
    private const MAP = [
        InsuranceProvider::CODE_ASS_SENEGAL => AssSenegalClient::class,
        InsuranceProvider::CODE_AMSA => AmsaClient::class,
        InsuranceProvider::CODE_PROVIDENCE => ProvidenceClient::class,
        InsuranceProvider::CODE_INTOUCH_AGGREGATOR => InTouchAggregatorClient::class,
    ];

    public function make(InsuranceProvider $provider): InsuranceProviderClient
    {
        $class = self::MAP[$provider->code] ?? null;

        if ($class === null) {
            throw new RuntimeException("No insurance provider client registered for code \"{$provider->code}\".");
        }

        return app($class);
    }
}
