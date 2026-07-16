<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserStatusRequest;
use App\Http\Resources\Admin\UserDetailResource;
use App\Http\Resources\Admin\UserSummaryResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'role' => ['sometimes', Rule::in(['rider', 'driver'])],
            'status' => ['sometimes', Rule::in(['active', 'suspended'])],
            'search' => ['sometimes', 'string'],
        ]);

        $users = User::query()
            ->with('driverProfile')
            ->when($request->filled('role'), fn ($q) => $q->where('role', $request->string('role')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->string('search');
                $q->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"));
            })
            ->latest()
            ->paginate(20);

        return UserSummaryResource::collection($users);
    }

    public function show(User $user)
    {
        $user->load(['driverProfile', 'wallet'])
            ->loadCount(['cars', 'trips', 'bookings']);

        return new UserDetailResource($user);
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user)
    {
        $user->update(['status' => $request->string('status')]);

        return new UserDetailResource($user->fresh(['driverProfile', 'wallet'])->loadCount(['cars', 'trips', 'bookings']));
    }
}
