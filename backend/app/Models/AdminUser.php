<?php

namespace App\Models;

use App\Support\AdminPermissions;
use Database\Factories\AdminUserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'status', 'last_login_at'])]
#[Hidden(['password', 'remember_token'])]
class AdminUser extends Authenticatable
{
    /** @use HasFactory<AdminUserFactory> */
    use HasApiTokens, HasFactory;

    const ROLE_SUPER_ADMIN = 'super_admin';

    const ROLE_ADMIN = 'admin';

    const ROLE_CONTROLLERS = 'controllers';

    const ROLE_SUPPORT = 'support';

    const ROLE_ACCOUNTANT = 'accountant';

    const ROLE_SUPERVISEUR = 'superviseur';

    const STATUS_ACTIVE = 'active';

    const STATUS_SUSPENDED = 'suspended';

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function hasPermission(string $permission): bool
    {
        return AdminPermissions::roleHas($this->role, $permission);
    }

    public function permissions(): array
    {
        return AdminPermissions::forRole($this->role);
    }
}
