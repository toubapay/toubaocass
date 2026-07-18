<?php

namespace App\Http\Requests\Driver;

use App\Models\InsurancePolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PurchaseInsuranceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'car_id' => ['required', 'integer', 'exists:cars,id'],
            'provider_id' => ['required', 'integer', 'exists:insurance_providers,id'],
            'coverage_type' => ['required', Rule::in([
                InsurancePolicy::COVERAGE_TIERS_SIMPLE,
                InsurancePolicy::COVERAGE_TIERS_COLLISION,
                InsurancePolicy::COVERAGE_TOUS_RISQUES,
            ])],
            'plan_name' => ['required', 'string', 'max:255'],
            'annual_premium' => ['required', 'integer', 'min:1'],
        ];
    }
}
