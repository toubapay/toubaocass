<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateDriverAvailabilityRequest;
use App\Http\Requests\UpdateDriverLocationRequest;
use App\Http\Resources\DriverProfileResource;
use App\Models\DriverProfile;

/**
 * Manual online/offline toggle for drivers, mirroring how a Uber-style
 * driver app works: going online marks the driver dispatchable for Dem
 * Légui ride requests and starts periodic location pings; going offline
 * removes them from consideration. No auto-offline logic (logout, app
 * background, etc.) in this version — purely a manual switch.
 */
class DriverAvailabilityController extends Controller
{
    public function update(UpdateDriverAvailabilityRequest $request)
    {
        $profile = $request->user()->driverProfile;

        if (! $profile) {
            return response()->json(['message' => "Profil conducteur introuvable."], 422);
        }

        $isOnline = $request->boolean('is_online');

        if ($isOnline) {
            if ($profile->kyc_status !== DriverProfile::STATUS_APPROVED) {
                return response()->json(['message' => "Votre dossier KYC doit être approuvé pour passer en ligne."], 422);
            }

            if (! $request->user()->cars()->where('is_active', true)->exists()) {
                return response()->json(['message' => "Vous devez avoir un véhicule actif pour passer en ligne."], 422);
            }
        }

        $profile->update([
            'is_online' => $isOnline,
            'last_seen_at' => now(),
            'current_latitude' => $isOnline ? $request->validated('latitude') : $profile->current_latitude,
            'current_longitude' => $isOnline ? $request->validated('longitude') : $profile->current_longitude,
        ]);

        return new DriverProfileResource($profile->fresh());
    }

    public function updateLocation(UpdateDriverLocationRequest $request)
    {
        $profile = $request->user()->driverProfile;

        if (! $profile || ! $profile->is_online) {
            return response()->json(['message' => 'Vous devez être en ligne pour partager votre position.'], 422);
        }

        $profile->update([
            'current_latitude' => $request->validated('latitude'),
            'current_longitude' => $request->validated('longitude'),
            'last_seen_at' => now(),
        ]);

        return response()->json(['message' => 'Position mise à jour.']);
    }
}
