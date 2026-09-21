<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RateDemLeguiTripRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'score' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ];
    }
}
