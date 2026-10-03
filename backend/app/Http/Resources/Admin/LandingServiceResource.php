<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LandingServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'icon' => $this->icon,
            'title_fr' => $this->title_fr,
            'title_ar' => $this->title_ar,
            'description_fr' => $this->description_fr,
            'description_ar' => $this->description_ar,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
        ];
    }
}
