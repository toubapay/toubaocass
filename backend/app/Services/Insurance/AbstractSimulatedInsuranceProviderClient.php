<?php

namespace App\Services\Insurance;

use App\Contracts\InsuranceProviderClient;
use App\Models\Car;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;
use Illuminate\Support\Str;

/**
 * Shared simulated pricing engine — every concrete provider client below
 * only differs by a pricing multiplier and plan naming, since none of
 * these insurers/aggregators have a real, documented API this platform can
 * call today. Swapping a provider to a live integration means replacing
 * its quote()/purchase() with real HTTP calls once InsuranceProvider
 * has real api_base_url/api_key values (see isLiveIntegrated()) — the
 * interface and callers don't need to change.
 */
abstract class AbstractSimulatedInsuranceProviderClient implements InsuranceProviderClient
{
    private const COVERAGE_BASE_RATES = [
        InsurancePolicy::COVERAGE_TIERS_SIMPLE => 45000,
        InsurancePolicy::COVERAGE_TIERS_COLLISION => 90000,
        InsurancePolicy::COVERAGE_TOUS_RISQUES => 160000,
    ];

    private const TYPE_MULTIPLIERS = [
        'sedan' => 1.0,
        'suv' => 1.25,
        'van' => 1.4,
        'minibus' => 1.6,
    ];

    abstract protected function providerMultiplier(): float;

    abstract protected function planName(string $coverageType): string;

    public function quote(InsuranceProvider $provider, Car $car, string $coverageType): array
    {
        $ageYears = max(0, now()->year - (int) $car->year);
        $ageFactor = 1 + min($ageYears, 15) * 0.015;
        $typeFactor = self::TYPE_MULTIPLIERS[$car->type] ?? 1.0;
        $baseRate = self::COVERAGE_BASE_RATES[$coverageType] ?? self::COVERAGE_BASE_RATES[InsurancePolicy::COVERAGE_TIERS_SIMPLE];

        $annualPremium = (int) (round($baseRate * $typeFactor * $ageFactor * $this->providerMultiplier() / 1000) * 1000);

        return [[
            'plan_name' => $this->planName($coverageType),
            'coverage_type' => $coverageType,
            'annual_premium' => $annualPremium,
            'highlights' => $this->highlights($coverageType),
        ]];
    }

    public function purchase(InsuranceProvider $provider, Car $car, array $selectedQuote): string
    {
        return strtoupper(Str::random(3)).'-'.now()->format('ymd').'-'.str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
    }

    /**
     * @return array<int, string>
     */
    private function highlights(string $coverageType): array
    {
        return match ($coverageType) {
            InsurancePolicy::COVERAGE_TIERS_SIMPLE => ['Responsabilité civile obligatoire', 'Assistance dépannage de base'],
            InsurancePolicy::COVERAGE_TIERS_COLLISION => ['Responsabilité civile', 'Vol et incendie', 'Assistance dépannage 24/7'],
            InsurancePolicy::COVERAGE_TOUS_RISQUES => ['Couverture tous risques', 'Vol, incendie et bris de glace', 'Véhicule de remplacement', 'Assistance dépannage 24/7'],
            default => [],
        };
    }
}
