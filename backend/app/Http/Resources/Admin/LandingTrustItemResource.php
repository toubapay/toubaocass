<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LandingTrustItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'icon' => $this->icon,
            'text_fr' => $this->text_fr,
            'text_ar' => $this->text_ar,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
        ];
    }
}
