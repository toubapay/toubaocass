<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLandingPageSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'brand_name' => ['sometimes', 'string', 'max:100'],
            'primary_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'primary_dark_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color' => ['sometimes', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],

            'nav_links' => ['sometimes', 'array'],
            'nav_links.*.label_fr' => ['required', 'string', 'max:100'],
            'nav_links.*.label_ar' => ['required', 'string', 'max:100'],
            'nav_links.*.href' => ['required', 'string', 'max:255'],

            'open_app_label_fr' => ['sometimes', 'string', 'max:100'],
            'open_app_label_ar' => ['sometimes', 'string', 'max:100'],
            'hero_cta_primary_fr' => ['sometimes', 'string', 'max:100'],
            'hero_cta_primary_ar' => ['sometimes', 'string', 'max:100'],
            'hero_cta_secondary_fr' => ['sometimes', 'string', 'max:100'],
            'hero_cta_secondary_ar' => ['sometimes', 'string', 'max:100'],

            'final_cta_title_fr' => ['sometimes', 'string', 'max:255'],
            'final_cta_title_ar' => ['sometimes', 'string', 'max:255'],
            'final_cta_subtitle_fr' => ['sometimes', 'string'],
            'final_cta_subtitle_ar' => ['sometimes', 'string'],
            'final_cta_button_fr' => ['sometimes', 'string', 'max:100'],
            'final_cta_button_ar' => ['sometimes', 'string', 'max:100'],

            'footer_blurb_fr' => ['sometimes', 'string'],
            'footer_blurb_ar' => ['sometimes', 'string'],
            'footer_company_fr' => ['sometimes', 'string', 'max:255'],
            'footer_company_ar' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
