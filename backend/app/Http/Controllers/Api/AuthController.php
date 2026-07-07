<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RequestOtpRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly OtpService $otpService) {}

    public function requestOtp(RequestOtpRequest $request)
    {
        $this->otpService->requestOtp($request->string('phone'), $request->string('role'));

        return response()->json([
            'message' => 'Un code de vérification a été envoyé par SMS.',
            'expires_in_minutes' => (int) config('services.otp.ttl_minutes'),
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request)
    {
        $result = $this->otpService->verifyOtp(
            $request->string('phone'),
            $request->string('role'),
            $request->string('code'),
        );

        /** @var User $user */
        $user = $result['user'];
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user->load('driverProfile')),
            'token' => $token,
            'is_new_user' => $result['is_new'],
        ]);
    }

    public function me(Request $request)
    {
        return new UserResource($request->user()->load('driverProfile'));
    }

    public function updateProfile(UpdateProfileRequest $request)
    {
        $request->user()->update($request->only('name', 'email'));

        return new UserResource($request->user()->fresh()->load('driverProfile'));
    }

    public function updateFcmToken(Request $request)
    {
        $request->validate(['fcm_token' => ['required', 'string']]);

        $request->user()->update(['fcm_token' => $request->string('fcm_token')]);

        return response()->json(['message' => 'Jeton FCM mis à jour.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
