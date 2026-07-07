<?php

namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', Rule::in(['sedan', 'suv', 'van', 'minibus'])],
            'make' => ['sometimes', 'string', 'max:100'],
            'model' => ['sometimes', 'string', 'max:100'],
            'year' => ['nullable', 'integer', 'min:1990', 'max:'.(date('Y') + 1)],
            'color' => ['nullable', 'string', 'max:50'],
            'plate_number' => ['sometimes', 'string', 'max:20', Rule::unique('cars', 'plate_number')->ignore($this->route('car'))],
            'seats' => ['sometimes', 'integer', 'min:1', 'max:29'],
            'photo' => ['nullable', 'file', 'image', 'max:5120'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
