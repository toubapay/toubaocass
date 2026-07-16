<?php

use App\Http\Controllers\Api\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CarController;
use App\Http\Controllers\Api\CityController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\TripController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('otp/request', [AuthController::class, 'requestOtp']);
    Route::post('otp/verify', [AuthController::class, 'verifyOtp']);
});

Route::get('cities', [CityController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::put('profile', [AuthController::class, 'updateProfile']);
    Route::post('fcm-token', [AuthController::class, 'updateFcmToken']);
    Route::post('logout', [AuthController::class, 'logout']);

    // Chat on a booking — shared between the rider who booked and the
    // driver of that trip (authorized per-booking, not per-role).
    Route::get('bookings/{booking}/messages', [MessageController::class, 'index']);
    Route::post('bookings/{booking}/messages', [MessageController::class, 'store']);

    // Wallet — available to both riders and drivers. Top-ups aren't
    // self-service; they're credited by an admin (see the wallet:top-up
    // Artisan command), so there's no top-up endpoint here.
    Route::get('wallet', [WalletController::class, 'show']);

    // Saved addresses — available to both riders and drivers.
    Route::get('addresses', [AddressController::class, 'index']);
    Route::post('addresses', [AddressController::class, 'store']);
    Route::put('addresses/{address}', [AddressController::class, 'update']);
    Route::delete('addresses/{address}', [AddressController::class, 'destroy']);

    // Rider-facing trip search & booking.
    Route::middleware('role:rider')->group(function () {
        Route::get('trips', [TripController::class, 'search']);
        Route::get('trips/{trip}', [TripController::class, 'show']);
        Route::post('trips/{trip}/bookings', [BookingController::class, 'store']);
        Route::get('bookings', [BookingController::class, 'index']);
        Route::put('bookings/{booking}', [BookingController::class, 'update']);
        Route::delete('bookings/{booking}', [BookingController::class, 'destroy']);

        // Livraison (package delivery) requests.
        Route::post('deliveries/quote', [DeliveryController::class, 'quote']);
        Route::get('deliveries', [DeliveryController::class, 'index']);
        Route::post('deliveries', [DeliveryController::class, 'store']);
        Route::get('deliveries/{delivery}', [DeliveryController::class, 'show']);
        Route::delete('deliveries/{delivery}', [DeliveryController::class, 'destroy']);
    });

    // Driver-facing KYC, fleet, and trip management.
    Route::prefix('driver')->middleware('role:driver')->group(function () {
        Route::get('kyc', [DriverController::class, 'showKyc']);
        Route::post('kyc', [DriverController::class, 'submitKyc']);

        Route::get('cars', [CarController::class, 'index']);
        Route::post('cars', [CarController::class, 'store']);
        Route::put('cars/{car}', [CarController::class, 'update']);
        Route::delete('cars/{car}', [CarController::class, 'destroy']);

        Route::get('trips', [TripController::class, 'driverIndex']);
        Route::post('trips', [TripController::class, 'store']);
        Route::get('trips/{trip}', [TripController::class, 'driverShow']);
        Route::put('trips/{trip}', [TripController::class, 'update']);
        Route::post('trips/{trip}/start', [TripController::class, 'start']);
        Route::post('trips/{trip}/complete', [TripController::class, 'complete']);
        Route::delete('trips/{trip}', [TripController::class, 'cancel']);

        // Livraison (package delivery) browsing & fulfillment.
        Route::get('deliveries/available', [DeliveryController::class, 'availableIndex']);
        Route::get('deliveries', [DeliveryController::class, 'driverIndex']);
        Route::get('deliveries/{delivery}', [DeliveryController::class, 'driverShow']);
        Route::post('deliveries/{delivery}/accept', [DeliveryController::class, 'accept']);
        Route::post('deliveries/{delivery}/pickup', [DeliveryController::class, 'pickup']);
        Route::post('deliveries/{delivery}/deliver', [DeliveryController::class, 'deliver']);
    });
});

// Admin back-office — separate admin_users identity/guard, not riders/drivers.
Route::prefix('admin')->group(function () {
    Route::post('login', [AdminAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'admin.auth'])->group(function () {
        Route::get('me', [AdminAuthController::class, 'me']);
        Route::post('logout', [AdminAuthController::class, 'logout']);

        Route::middleware('admin.permission:manage_users')->group(function () {
            Route::get('users', [AdminUserController::class, 'index']);
            Route::get('users/{user}', [AdminUserController::class, 'show']);
            Route::put('users/{user}/status', [AdminUserController::class, 'updateStatus']);
        });
    });
});
