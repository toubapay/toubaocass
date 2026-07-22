<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'name', 'description', 'category', 'config', 'is_enabled', 'enabled_at', 'disabled_at'])]
class Module extends Model
{
    protected function casts(): array
    {
        return [
            'config' => 'array',
            'is_enabled' => 'boolean',
            'enabled_at' => 'datetime',
            'disabled_at' => 'datetime',
        ];
    }

    public function isEnabled(): bool
    {
        return $this->is_enabled;
    }
}
