<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'regex:/^\+?[1-9]\d{7,14}$/'],
            'role' => ['required', Rule::in(['rider', 'driver'])],
            'code' => ['required', 'string', 'size:6'],
        ];
    }
}
