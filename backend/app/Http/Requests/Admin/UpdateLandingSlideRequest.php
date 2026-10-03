<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingSlideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'emoji' => ['sometimes', 'string', 'max:16'],
            'eyebrow_fr' => ['sometimes', 'string', 'max:255'],
            'eyebrow_ar' => ['sometimes', 'string', 'max:255'],
            'title_fr' => ['sometimes', 'string', 'max:255'],
            'title_ar' => ['sometimes', 'string', 'max:255'],
            'subtitle_fr' => ['sometimes', 'string'],
            'subtitle_ar' => ['sometimes', 'string'],
            'sort_order' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
