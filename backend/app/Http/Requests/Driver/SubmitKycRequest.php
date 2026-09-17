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
        $userId = $this->user()->id;

        return [
            'license_number' => ['required', 'string', 'max:50'],
            'license_expiry' => ['required', 'date', 'after:today'],
            // Not a re-upload — this is the storage path driver/kyc/scan
            // already returned after storing the photo, so it must live
            // under this driver's own kyc/{id}/ prefix.
            'license_document_path' => ['required', 'string', function ($attribute, $value, $fail) use ($userId) {
                if (! str_starts_with($value, "kyc/{$userId}/")) {
                    $fail('Document invalide.');
                }
            }],
        ];
    }
}
