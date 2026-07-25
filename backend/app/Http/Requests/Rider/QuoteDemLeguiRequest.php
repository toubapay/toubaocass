<?php

namespace App\Http\Requests\Rider;

use Illuminate\Foundation\Http\FormRequest;

class QuoteDemLeguiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pickup_latitude' => ['required', 'numeric', 'between:-90,90'],
            'pickup_longitude' => ['required', 'numeric', 'between:-180,180'],
            'destination_city_id' => ['required', 'exists:cities,id'],
            'seats_requested' => ['sometimes', 'integer', 'min:1', 'max:8'],
        ];
    }
}
