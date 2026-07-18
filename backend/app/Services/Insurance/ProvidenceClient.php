<?php

namespace App\Services\Insurance;

class ProvidenceClient extends AbstractSimulatedInsuranceProviderClient
{
    protected function providerMultiplier(): float
    {
        return 1.08;
    }

    protected function planName(string $coverageType): string
    {
        return 'Providence Assurances — '.match ($coverageType) {
            'tiers_simple' => 'Offre Basique',
            'tiers_collision' => 'Offre Équilibre',
            'tous_risques' => 'Offre Excellence',
            default => 'Offre Standard',
        };
    }
}
