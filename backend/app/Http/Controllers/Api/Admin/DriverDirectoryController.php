<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Http\Request;

class DriverDirectoryController extends Controller
{
    /**
     * Approved drivers eligible to be assigned a trip or delivery from the
     * admin back-office — optionally narrowed to those with an active car,
     * which a scheduled Trip requires (a Delivery does not).
     */
    public function eligible(Request $request)
    {
        $requiresActiveCar = $request->boolean('requires_active_car');

        $drivers = User::query()
            ->where('role', User::ROLE_DRIVER)
            ->whereHas('driverProfile', fn ($q) => $q->where('kyc_status', DriverProfile::STATUS_APPROVED))
            ->when($requiresActiveCar, fn ($q) => $q->whereHas('cars', fn ($q) => $q->where('is_active', true)))
            ->orderBy('name')
            ->get(['id', 'name', 'phone']);

        return response()->json(['drivers' => $drivers]);
    }
}
