<?php

namespace App\Services\Insurance;

use App\Models\Car;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;
use App\Models\User;
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

    /**
     * Same comparison, but for a vehicle described directly by the rider
     * or driver (scanned carte grise info) rather than an existing fleet
     * Car. Reuses compare() unchanged via a transient, never-persisted Car
     * built from the given attributes — every concrete provider client
     * keeps reading plain Car properties and doesn't know the difference.
     * Factors the shared pricing engine has no concept of (vehicle
     * category, personal/professional use, horsepower) are then layered
     * on top as a post-multiply here instead.
     *
     * @param  array{vehicle_category: string, vehicle_power_cv?: ?int, vehicle_seats?: ?int, vehicle_age_bracket: string, vehicle_usage_type: string}  $vehicle
     * @return array<int, array{provider_id: int, provider_name: string, plan_name: string, coverage_type: string, annual_premium: int, monthly_premium: int, highlights: array<int, string>}>
     */
    public function compareForVehicle(array $vehicle, string $coverageType): array
    {
        $quotes = $this->compare($this->transientCar($vehicle), $coverageType);

        $categoryFactor = $vehicle['vehicle_category'] === InsurancePolicy::VEHICLE_CATEGORY_MOTORCYCLE ? 0.5 : 1.0;
        $usageFactor = $vehicle['vehicle_usage_type'] === InsurancePolicy::USAGE_TYPE_PROFESSIONAL ? 1.2 : 1.0;
        $powerFactor = 1 + max(0, ($vehicle['vehicle_power_cv'] ?? 5) - 5) * 0.03;

        return collect($quotes)
            ->map(function (array $quote) use ($categoryFactor, $usageFactor, $powerFactor) {
                $quote['annual_premium'] = (int) (round($quote['annual_premium'] * $categoryFactor * $usageFactor * $powerFactor / 1000) * 1000);
                $quote['monthly_premium'] = (int) round($quote['annual_premium'] / 12);

                return $quote;
            })
            ->all();
    }

    /**
     * Confirms a vehicle-attribute quote and records the resulting policy
     * with car_id left null — the vehicle_* columns on the policy are the
     * source of truth instead, snapshotted from what the rider/driver
     * confirmed on the vehicle-info step.
     *
     * @param  array{vehicle_category: string, make?: ?string, model?: ?string, plate_number?: ?string, vehicle_power_cv?: ?int, vehicle_seats?: ?int, vehicle_age_bracket: string, vehicle_usage_type: string, carte_grise_front_path?: ?string, carte_grise_back_path?: ?string}  $vehicle
     */
    public function purchaseForVehicle(User $user, array $vehicle, InsuranceProvider $provider, array $selectedQuote): InsurancePolicy
    {
        $client = $this->clientFactory->make($provider);
        $policyNumber = $client->purchase($provider, $this->transientCar($vehicle), $selectedQuote);

        $policy = InsurancePolicy::create([
            'car_id' => null,
            'driver_id' => $user->id,
            'insurance_provider_id' => $provider->id,
            'vehicle_category' => $vehicle['vehicle_category'],
            'vehicle_make' => $vehicle['make'] ?? null,
            'vehicle_model' => $vehicle['model'] ?? null,
            'vehicle_plate_number' => $vehicle['plate_number'] ?? null,
            'vehicle_power_cv' => $vehicle['vehicle_power_cv'] ?? null,
            'vehicle_seats' => $vehicle['vehicle_seats'] ?? null,
            'vehicle_age_bracket' => $vehicle['vehicle_age_bracket'],
            'vehicle_usage_type' => $vehicle['vehicle_usage_type'],
            'carte_grise_front_path' => $vehicle['carte_grise_front_path'] ?? null,
            'carte_grise_back_path' => $vehicle['carte_grise_back_path'] ?? null,
            'coverage_type' => $selectedQuote['coverage_type'],
            'plan_name' => $selectedQuote['plan_name'],
            'annual_premium' => $selectedQuote['annual_premium'],
            'policy_number' => $policyNumber ?: strtoupper(Str::random(10)),
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addYear()->toDateString(),
            'status' => InsurancePolicy::STATUS_ACTIVE,
        ]);

        return $this->commission->applyToInsurancePolicy($policy)->load('provider');
    }

    /**
     * A never-persisted Car standing in for a scanned vehicle so the
     * existing quote()/purchase() interface (which only reads Car::$type
     * and Car::$year) doesn't need to change at all.
     *
     * @param  array{vehicle_category: string, vehicle_seats?: ?int, vehicle_age_bracket: string}  $vehicle
     */
    private function transientCar(array $vehicle): Car
    {
        return new Car([
            'type' => $vehicle['vehicle_category'] === InsurancePolicy::VEHICLE_CATEGORY_MOTORCYCLE ? 'moto' : 'sedan',
            'year' => $this->yearFromAgeBracket($vehicle['vehicle_age_bracket']),
            'seats' => $vehicle['vehicle_seats'] ?? 4,
        ]);
    }

    private function yearFromAgeBracket(string $bracket): int
    {
        return match ($bracket) {
            InsurancePolicy::AGE_BRACKET_UNDER_5 => now()->year - 2,
            InsurancePolicy::AGE_BRACKET_FROM_5_TO_10 => now()->year - 7,
            InsurancePolicy::AGE_BRACKET_OVER_10 => now()->year - 12,
            default => now()->year - 2,
        };
    }
}
