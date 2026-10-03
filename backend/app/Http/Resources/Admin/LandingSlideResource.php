<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LandingSlideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'emoji' => $this->emoji,
            'eyebrow_fr' => $this->eyebrow_fr,
            'eyebrow_ar' => $this->eyebrow_ar,
            'title_fr' => $this->title_fr,
            'title_ar' => $this->title_ar,
            'subtitle_fr' => $this->subtitle_fr,
            'subtitle_ar' => $this->subtitle_ar,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
        ];
    }
}
