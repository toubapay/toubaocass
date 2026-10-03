<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['emoji', 'eyebrow_fr', 'eyebrow_ar', 'title_fr', 'title_ar', 'subtitle_fr', 'subtitle_ar', 'sort_order', 'is_active'])]
class LandingSlide extends Model
{
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
