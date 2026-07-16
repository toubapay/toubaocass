<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\AdminUser;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function index()
    {
        $admins = AdminUser::query()->latest()->paginate(20);

        return AdminUserResource::collection($admins);
    }

    public function store(StoreAdminUserRequest $request)
    {
        $admin = AdminUser::create($request->validated());

        $this->auditLog->record($request->user(), 'admin.create', "Compte admin créé pour {$admin->email} (rôle {$admin->role}).", $admin);

        return new AdminUserResource($admin);
    }

    public function update(UpdateAdminUserRequest $request, AdminUser $adminUser)
    {
        $adminUser->update($request->validated());

        $this->auditLog->record(
            $request->user(),
            'admin.update',
            "Compte admin #{$adminUser->id} ({$adminUser->email}) modifié.",
            $adminUser,
            collect($request->validated())->except('password')->all(),
        );

        return new AdminUserResource($adminUser->fresh());
    }
}
