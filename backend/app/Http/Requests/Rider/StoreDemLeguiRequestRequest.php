<?php

namespace App\Http\Requests\Rider;

use App\Models\DemLeguiRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDemLeguiRequestRequest extends FormRequest
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
            'pickup_address' => ['nullable', 'string', 'max:255'],
            'destination_city_id' => ['required', 'exists:cities,id'],
            'destination_address' => ['nullable', 'string', 'max:255'],
            'seats_requested' => ['sometimes', 'integer', 'min:1', 'max:8'],
            'payment_method' => ['sometimes', Rule::in([DemLeguiRequest::PAYMENT_METHOD_CASH, DemLeguiRequest::PAYMENT_METHOD_WALLET])],
        ];
    }
}
