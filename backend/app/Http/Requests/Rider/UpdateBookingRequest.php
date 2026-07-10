<?php

namespace App\Http\Requests\Rider;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'seats' => ['required', 'integer', 'min:0', 'max:29'],
        ];
    }
}
