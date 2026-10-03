<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLandingSlideRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'emoji' => ['nullable', 'string', 'max:16'],
            'eyebrow_fr' => ['required', 'string', 'max:255'],
            'eyebrow_ar' => ['required', 'string', 'max:255'],
            'title_fr' => ['required', 'string', 'max:255'],
            'title_ar' => ['required', 'string', 'max:255'],
            'subtitle_fr' => ['required', 'string'],
            'subtitle_ar' => ['required', 'string'],
            'sort_order' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
