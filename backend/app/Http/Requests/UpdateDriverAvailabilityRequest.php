<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDriverAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_online' => ['required', 'boolean'],
            'latitude' => ['required_if:is_online,true', 'numeric', 'between:-90,90'],
            'longitude' => ['required_if:is_online,true', 'numeric', 'between:-180,180'],
        ];
    }
}
