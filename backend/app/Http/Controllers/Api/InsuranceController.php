<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\PurchaseInsuranceRequest;
use App\Http\Requests\Driver\QuoteInsuranceRequest;
use App\Http\Resources\InsurancePolicyResource;
use App\Http\Resources\InsuranceProviderResource;
use App\Models\Car;
use App\Models\InsuranceProvider;
use App\Services\Insurance\InsuranceComparisonService;
use Illuminate\Http\Request;

class InsuranceController extends Controller
{
    public function __construct(private readonly InsuranceComparisonService $comparison) {}

    public function providers()
    {
        return InsuranceProviderResource::collection(
            InsuranceProvider::where('is_active', true)->orderBy('name')->get()
        );
    }

    public function quote(QuoteInsuranceRequest $request)
    {
        $car = Car::findOrFail($request->validated('car_id'));
        $this->authorize('update', $car);

        return response()->json([
            'quotes' => $this->comparison->compare($car, $request->validated('coverage_type')),
        ]);
    }

    public function purchase(PurchaseInsuranceRequest $request)
    {
        $car = Car::findOrFail($request->validated('car_id'));
        $this->authorize('update', $car);

        $provider = InsuranceProvider::where('is_active', true)->findOrFail($request->validated('provider_id'));

        $policy = $this->comparison->purchase($car, $provider, $request->validated());

        return new InsurancePolicyResource($policy);
    }

    public function index(Request $request)
    {
        $policies = $request->user()->insurancePolicies()
            ->with(['car', 'provider'])
            ->latest()
            ->paginate(20);

        return InsurancePolicyResource::collection($policies);
    }
}
