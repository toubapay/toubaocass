<?php

namespace App\Http\Requests\Rider;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SearchTripsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'origin_city_id' => ['nullable', 'exists:cities,id'],
            'destination_city_id' => ['nullable', 'exists:cities,id'],
            'date' => ['nullable', 'date'],
            'ride_type' => ['nullable', Rule::in(['standard', 'comfort', 'xl'])],
            'seats' => ['nullable', 'integer', 'min:1', 'max:29'],
            'lat' => ['nullable', 'numeric', 'between:-90,90', 'required_with:lng'],
            'lng' => ['nullable', 'numeric', 'between:-180,180', 'required_with:lat'],
            'radius_km' => ['nullable', 'numeric', 'min:1', 'max:500'],
        ];
    }
}
