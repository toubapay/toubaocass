<?php

namespace App\Http\Requests\Driver;

use App\Models\InsurancePolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QuoteInsuranceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'car_id' => ['required', 'integer', 'exists:cars,id'],
            'coverage_type' => ['required', Rule::in([
                InsurancePolicy::COVERAGE_TIERS_SIMPLE,
                InsurancePolicy::COVERAGE_TIERS_COLLISION,
                InsurancePolicy::COVERAGE_TOUS_RISQUES,
            ])],
        ];
    }
}
