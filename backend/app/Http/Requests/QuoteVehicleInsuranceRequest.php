<?php

namespace App\Http\Requests;

use App\Models\InsurancePolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuoteVehicleInsuranceRequest extends FormRequest
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
            'coverage_type' => ['required', Rule::in([
                InsurancePolicy::COVERAGE_TIERS_SIMPLE,
                InsurancePolicy::COVERAGE_TIERS_COLLISION,
                InsurancePolicy::COVERAGE_TOUS_RISQUES,
            ])],
        ];
    }
}
