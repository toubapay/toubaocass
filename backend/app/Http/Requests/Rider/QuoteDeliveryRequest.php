<?php

namespace App\Http\Requests\Rider;

use Illuminate\Foundation\Http\FormRequest;

class QuoteDeliveryRequest extends FormRequest
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
            'receiver_latitude' => ['required', 'numeric', 'between:-90,90'],
            'receiver_longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }
}
