<?php

namespace App\Http\Requests\Admin;

use App\Models\AdminUser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'unique:admin_users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in([
                AdminUser::ROLE_SUPER_ADMIN, AdminUser::ROLE_ADMIN, AdminUser::ROLE_CONTROLLERS,
                AdminUser::ROLE_SUPPORT, AdminUser::ROLE_ACCOUNTANT, AdminUser::ROLE_SUPERVISEUR,
            ])],
        ];
    }
}
