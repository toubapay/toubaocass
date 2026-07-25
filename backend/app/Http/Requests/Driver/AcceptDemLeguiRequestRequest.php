<?php

namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;

class AcceptDemLeguiRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Only required when this acceptance creates a brand new trip
            // (no compatible open trip already exists for this driver) —
            // enforced in the controller, since it depends on DB state.
            'car_id' => ['nullable', 'integer', 'exists:cars,id'],
        ];
    }
}
