<?php

namespace App\Http\Requests\Admin;

use App\Services\KycReviewService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateKycModeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mode' => ['required', Rule::in([KycReviewService::MODE_AUTOMATIC, KycReviewService::MODE_MANUAL])],
        ];
    }
}
