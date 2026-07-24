<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RateAnandoRideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ratee_id' => ['required', 'integer', 'exists:users,id'],
            'score' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ];
    }
}
