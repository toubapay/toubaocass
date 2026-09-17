<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ModuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->category,
            'config' => $this->config,
            'is_enabled' => $this->is_enabled,
            'enabled_for_rider' => $this->enabled_for_rider,
            'enabled_for_driver' => $this->enabled_for_driver,
            'enabled_at' => $this->enabled_at,
            'disabled_at' => $this->disabled_at,
            'created_at' => $this->created_at,
        ];
    }
}
