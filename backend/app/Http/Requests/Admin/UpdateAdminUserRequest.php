<?php

namespace App\Http\Requests\Admin;

use App\Models\AdminUser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', Rule::unique('admin_users', 'email')->ignore($this->route('adminUser'))],
            'password' => ['sometimes', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in([
                AdminUser::ROLE_SUPER_ADMIN, AdminUser::ROLE_ADMIN, AdminUser::ROLE_CONTROLLERS,
                AdminUser::ROLE_SUPPORT, AdminUser::ROLE_ACCOUNTANT, AdminUser::ROLE_SUPERVISEUR,
            ])],
            'status' => ['sometimes', Rule::in([AdminUser::STATUS_ACTIVE, AdminUser::STATUS_SUSPENDED])],
        ];
    }
}
