<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScanVehicleDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'carte_grise_front' => ['required', 'file', 'image', 'max:5120'],
            'carte_grise_back' => ['nullable', 'file', 'image', 'max:5120'],
        ];
    }
}
