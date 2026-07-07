<?php

namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['sedan', 'suv', 'van', 'minibus'])],
            'make' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'year' => ['nullable', 'integer', 'min:1990', 'max:'.(date('Y') + 1)],
            'color' => ['nullable', 'string', 'max:50'],
            'plate_number' => ['required', 'string', 'max:20', 'unique:cars,plate_number'],
            'seats' => ['required', 'integer', 'min:1', 'max:29'],
            'photo' => ['nullable', 'file', 'image', 'max:5120'],
        ];
    }
}
