<?php

namespace App\Http\Requests\Rider;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'seats' => ['required', 'integer', 'min:1', 'max:29'],
        ];
    }
}
