<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingTrustItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'icon' => ['sometimes', 'string', 'max:16'],
            'text_fr' => ['sometimes', 'string', 'max:255'],
            'text_ar' => ['sometimes', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
