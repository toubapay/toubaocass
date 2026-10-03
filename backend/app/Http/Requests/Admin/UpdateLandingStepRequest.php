<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingStepRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title_fr' => ['sometimes', 'string', 'max:255'],
            'title_ar' => ['sometimes', 'string', 'max:255'],
            'description_fr' => ['sometimes', 'string'],
            'description_ar' => ['sometimes', 'string'],
            'sort_order' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
