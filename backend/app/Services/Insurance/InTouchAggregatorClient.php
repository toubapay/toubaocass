<?php

namespace App\Services\Insurance;

/**
 * Models an aggregator/integrator layer (à la InTouch or Baloon) that
 * brokers rates across several underlying insurers rather than
 * underwriting itself — in the simulation this shows up as a small
 * discount versus going to a single insurer directly.
 */
class InTouchAggregatorClient extends AbstractSimulatedInsuranceProviderClient
{
    protected function providerMultiplier(): float
    {
        return 0.97;
    }

    protected function planName(string $coverageType): string
    {
        return 'InTouch — '.match ($coverageType) {
            'tiers_simple' => 'Offre partenaire Éco',
            'tiers_collision' => 'Offre partenaire Plus',
            'tous_risques' => 'Offre partenaire Premium',
            default => 'Offre partenaire',
        };
    }
}
