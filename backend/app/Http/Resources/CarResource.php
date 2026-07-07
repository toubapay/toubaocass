<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CarResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'make' => $this->make,
            'model' => $this->model,
            'year' => $this->year,
            'color' => $this->color,
            'plate_number' => $this->plate_number,
            'seats' => $this->seats,
            'photo_url' => $this->photo_path ? Storage::url($this->photo_path) : null,
            'is_active' => $this->is_active,
        ];
    }
}
