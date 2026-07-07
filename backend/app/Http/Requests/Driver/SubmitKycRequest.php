<?php

namespace App\Http\Requests\Driver;

use Illuminate\Foundation\Http\FormRequest;

class SubmitKycRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'license_number' => ['required', 'string', 'max:50'],
            'license_expiry' => ['required', 'date', 'after:today'],
            'national_id_number' => ['required', 'string', 'max:50'],
            'id_document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'license_document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'selfie' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
        ];
    }
}
