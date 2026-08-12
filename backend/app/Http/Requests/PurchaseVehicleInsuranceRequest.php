<?php

namespace App\Http\Requests;

use App\Models\InsurancePolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PurchaseVehicleInsuranceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicle_category' => ['required', Rule::in([
                InsurancePolicy::VEHICLE_CATEGORY_CAR,
                InsurancePolicy::VEHICLE_CATEGORY_MOTORCYCLE,
            ])],
            'make' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'plate_number' => ['nullable', 'string', 'max:50'],
            'vehicle_power_cv' => ['nullable', 'integer', 'min:1', 'max:99'],
            'vehicle_seats' => ['nullable', 'integer', 'min:1', 'max:9'],
            'vehicle_age_bracket' => ['required', Rule::in([
                InsurancePolicy::AGE_BRACKET_UNDER_5,
                InsurancePolicy::AGE_BRACKET_FROM_5_TO_10,
                InsurancePolicy::AGE_BRACKET_OVER_10,
            ])],
            'vehicle_usage_type' => ['required', Rule::in([
                InsurancePolicy::USAGE_TYPE_PERSONAL,
                InsurancePolicy::USAGE_TYPE_PROFESSIONAL,
            ])],
            'carte_grise_front_path' => ['nullable', 'string', 'max:255'],
            'carte_grise_back_path' => ['nullable', 'string', 'max:255'],
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
