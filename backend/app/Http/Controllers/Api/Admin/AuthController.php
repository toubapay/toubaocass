<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\AdminUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $admin = AdminUser::where('email', $request->string('email'))->first();

        if (! $admin || ! Hash::check($request->string('password'), $admin->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        if (! $admin->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte administrateur a été suspendu.'],
            ]);
        }

        $admin->update(['last_login_at' => now()]);

        $token = $admin->createToken('admin')->plainTextToken;

        return response()->json([
            'admin' => new AdminUserResource($admin),
            'token' => $token,
        ]);
    }

    public function me(Request $request)
    {
        return new AdminUserResource($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
