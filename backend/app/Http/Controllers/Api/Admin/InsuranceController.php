<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreInsuranceProviderRequest;
use App\Http\Requests\Admin\UpdateInsuranceProviderRequest;
use App\Http\Resources\Admin\InsurancePolicyResource;
use App\Http\Resources\Admin\InsuranceProviderResource;
use App\Models\InsurancePolicy;
use App\Models\InsuranceProvider;

class InsuranceController extends Controller
{
    public function providers()
    {
        return InsuranceProviderResource::collection(
            InsuranceProvider::query()->orderBy('name')->get()
        );
    }

    public function storeProvider(StoreInsuranceProviderRequest $request)
    {
        $provider = InsuranceProvider::create($request->validated());

        return new InsuranceProviderResource($provider);
    }

    public function updateProvider(UpdateInsuranceProviderRequest $request, InsuranceProvider $insuranceProvider)
    {
        $insuranceProvider->update($request->validated());

        return new InsuranceProviderResource($insuranceProvider->fresh());
    }

    public function policies()
    {
        $policies = InsurancePolicy::query()
            ->with(['driver', 'car', 'provider'])
            ->latest()
            ->paginate(20);

        return InsurancePolicyResource::collection($policies);
    }
}
