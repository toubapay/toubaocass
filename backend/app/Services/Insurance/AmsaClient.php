<?php

namespace App\Services\Insurance;

class AmsaClient extends AbstractSimulatedInsuranceProviderClient
{
    protected function providerMultiplier(): float
    {
        return 0.93;
    }

    protected function planName(string $coverageType): string
    {
        return 'AMSA Assurances — '.match ($coverageType) {
            'tiers_simple' => 'Pack Essentiel',
            'tiers_collision' => 'Pack Avantage',
            'tous_risques' => 'Pack Intégral',
            default => 'Pack Standard',
        };
    }
}
