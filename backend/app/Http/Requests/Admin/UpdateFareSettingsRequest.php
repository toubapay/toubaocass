<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFareSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delivery_base_fee' => ['sometimes', 'numeric', 'min:0'],
            'delivery_fee_per_km' => ['sometimes', 'numeric', 'min:0'],
            'dem_legui_base_fare' => ['sometimes', 'numeric', 'min:0'],
            'dem_legui_fare_per_km' => ['sometimes', 'numeric', 'min:0'],
            'commission_rate_trip' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'commission_rate_delivery' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
