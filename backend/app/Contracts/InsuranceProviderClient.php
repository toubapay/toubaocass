<?php

namespace App\Contracts;

use App\Models\Car;
use App\Models\InsuranceProvider;

/**
 * One implementation per insurer/aggregator, resolved by
 * InsuranceProviderClientFactory from InsuranceProvider::code. Until a
 * provider's real API base URL/key are configured (see
 * InsuranceProvider::isLiveIntegrated()), implementations run in
 * simulated-quote mode — there is no live call out to any insurer today.
 */
interface InsuranceProviderClient
{
    /**
     * @return array<int, array{plan_name: string, coverage_type: string, annual_premium: int, highlights: array<int, string>}>
     */
    public function quote(InsuranceProvider $provider, Car $car, string $coverageType): array;

    /**
     * Confirms/issues a policy with the provider for a quote already
     * returned by quote(). Returns the provider-issued policy number.
     */
    public function purchase(InsuranceProvider $provider, Car $car, array $selectedQuote): string;
}
