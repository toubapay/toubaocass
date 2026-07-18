<?php

namespace App\Services\Insurance;

use App\Models\Car;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;
use App\Services\CommissionService;
use Illuminate\Support\Str;

class InsuranceComparisonService
{
    public function __construct(
        private readonly InsuranceProviderClientFactory $clientFactory,
        private readonly CommissionService $commission,
    ) {}

    /**
     * Fans out to every active provider's client and flattens their quotes
     * into one comparable list, cheapest first.
     *
     * @return array<int, array{provider_id: int, provider_name: string, plan_name: string, coverage_type: string, annual_premium: int, monthly_premium: int, highlights: array<int, string>}>
     */
    public function compare(Car $car, string $coverageType): array
    {
        $quotes = InsuranceProvider::query()
            ->where('is_active', true)
            ->get()
            ->flatMap(function (InsuranceProvider $provider) use ($car, $coverageType) {
                $client = $this->clientFactory->make($provider);

                return collect($client->quote($provider, $car, $coverageType))
                    ->map(fn (array $quote) => [
                        'provider_id' => $provider->id,
                        'provider_name' => $provider->name,
                        'plan_name' => $quote['plan_name'],
                        'coverage_type' => $quote['coverage_type'],
                        'annual_premium' => $quote['annual_premium'],
                        'monthly_premium' => (int) round($quote['annual_premium'] / 12),
                        'highlights' => $quote['highlights'],
                    ]);
            })
            ->sortBy('annual_premium')
            ->values();

        return $quotes->all();
    }

    /**
     * Confirms a previously-quoted plan with the provider and records the
     * resulting policy, with commission snapshotted at purchase time.
     */
    public function purchase(Car $car, InsuranceProvider $provider, array $selectedQuote): InsurancePolicy
    {
        $client = $this->clientFactory->make($provider);
        $policyNumber = $client->purchase($provider, $car, $selectedQuote);

        $policy = InsurancePolicy::create([
            'car_id' => $car->id,
            'driver_id' => $car->driver_id,
            'insurance_provider_id' => $provider->id,
            'coverage_type' => $selectedQuote['coverage_type'],
            'plan_name' => $selectedQuote['plan_name'],
            'annual_premium' => $selectedQuote['annual_premium'],
            'policy_number' => $policyNumber ?: strtoupper(Str::random(10)),
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addYear()->toDateString(),
            'status' => InsurancePolicy::STATUS_ACTIVE,
        ]);

        return $this->commission->applyToInsurancePolicy($policy)->load('provider', 'car');
    }
}
