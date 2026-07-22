<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Validator;

class StoreAnandoRideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'origin_city_id' => ['required', 'integer', 'exists:cities,id'],
            'destination_city_id' => ['required', 'integer', 'exists:cities,id', 'different:origin_city_id'],
            'departure_point' => ['nullable', 'string', 'max:255'],
            'departure_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'departure_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'departure_at' => ['nullable', 'date'],
            'price_per_seat' => ['required', 'integer', 'min:100'],
            'total_seats' => ['required', 'integer', 'min:1', 'max:8'],
            'vehicle_info' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $at = $this->input('departure_at');
            if ($at && Carbon::parse($at)->isPast()) {
                $validator->errors()->add('departure_at', "L'heure de départ ne peut pas être dans le passé.");
            }
        });
    }
}
