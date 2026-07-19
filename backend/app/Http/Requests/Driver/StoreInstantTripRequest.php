<?php

namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * "Instant Post" style trip — no departure_date/departure_time to pick,
 * unlike StoreTripRequest. The controller stamps the departure instant as
 * right now.
 */
class StoreInstantTripRequest extends FormRequest
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
            'departure_latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:departure_longitude'],
            'departure_longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:departure_latitude'],
            'departure_address' => ['nullable', 'string', 'max:255'],
            'fare' => ['required', 'integer', 'min:100'],
            'ride_type' => ['required', Rule::in(['standard', 'comfort', 'xl'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
