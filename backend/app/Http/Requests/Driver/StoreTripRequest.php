<?php

namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTripRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'car_id' => [
                'required',
                Rule::exists('cars', 'id')->where('driver_id', $this->user()->id),
            ],
            'origin_city_id' => ['required', 'exists:cities,id', 'different:destination_city_id'],
            'destination_city_id' => ['required', 'exists:cities,id'],
            'departure_date' => ['required', 'date', 'after_or_equal:today'],
            'departure_time' => ['required', 'date_format:H:i'],
            'fare' => ['required', 'integer', 'min:100'],
            'ride_type' => ['required', Rule::in(['standard', 'comfort', 'xl'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
