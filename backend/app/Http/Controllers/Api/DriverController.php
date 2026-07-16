<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\SubmitKycRequest;
use App\Http\Resources\DriverProfileResource;
use App\Models\DriverProfile;
use App\Services\KycReviewService;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    public function __construct(private readonly KycReviewService $kycReviewService) {}

    public function showKyc(Request $request)
    {
        $profile = $request->user()->driverProfile;

        return new DriverProfileResource($profile);
    }

    public function submitKyc(SubmitKycRequest $request)
    {
        $user = $request->user();

        $kycDisk = config('filesystems.kyc_disk');

        $paths = [
            'id_document_path' => $request->file('id_document')->store("kyc/{$user->id}", $kycDisk),
            'license_document_path' => $request->file('license_document')->store("kyc/{$user->id}", $kycDisk),
            'selfie_path' => $request->file('selfie')->store("kyc/{$user->id}", $kycDisk),
        ];

        $profile = DriverProfile::updateOrCreate(
            ['user_id' => $user->id],
            array_merge($request->only('license_number', 'license_expiry', 'national_id_number'), $paths, [
                'kyc_status' => DriverProfile::STATUS_SUBMITTED,
                'kyc_rejection_reason' => null,
            ]),
        );

        $profile = $this->kycReviewService->maybeAutoReview($profile);

        return new DriverProfileResource($profile);
    }
}
