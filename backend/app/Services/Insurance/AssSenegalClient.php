<?php

namespace App\Services\Insurance;

class AssSenegalClient extends AbstractSimulatedInsuranceProviderClient
{
    protected function providerMultiplier(): float
    {
        return 1.0;
    }

    protected function planName(string $coverageType): string
    {
        return 'Ass Sénégal — '.match ($coverageType) {
            'tiers_simple' => 'Formule Éco',
            'tiers_collision' => 'Formule Confort',
            'tous_risques' => 'Formule Sérénité',
            default => 'Formule Standard',
        };
    }
}
