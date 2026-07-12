<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CarController;
use App\Http\Controllers\Api\CityController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\TripController;
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

    // Rider-facing trip search & booking.
    Route::middleware('role:rider')->group(function () {
        Route::get('trips', [TripController::class, 'search']);
        Route::get('trips/{trip}', [TripController::class, 'show']);
        Route::post('trips/{trip}/bookings', [BookingController::class, 'store']);
        Route::get('bookings', [BookingController::class, 'index']);
        Route::put('bookings/{booking}', [BookingController::class, 'update']);
        Route::delete('bookings/{booking}', [BookingController::class, 'destroy']);
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
    });
});
