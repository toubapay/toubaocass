<?php

namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTripRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'departure_date' => ['sometimes', 'date', 'after_or_equal:today'],
            'departure_time' => ['sometimes', 'date_format:H:i'],
            'fare' => ['sometimes', 'integer', 'min:100'],
            'ride_type' => ['sometimes', Rule::in(['standard', 'comfort', 'xl'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
