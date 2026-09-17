<?php

namespace App\Http\Controllers\Api;

use App\Contracts\DocumentOcrClient;
use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\ScanLicenseDocumentRequest;
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

    /**
     * Stores the scanned license photo and runs OCR on it so the form can
     * pre-fill license_number/license_expiry — mirrors
     * InsuranceController::scanVehicleDocument's shape (store first, return
     * the path + extracted fields, submission just references that path).
     */
    public function scanLicense(ScanLicenseDocumentRequest $request, DocumentOcrClient $ocr)
    {
        $disk = config('filesystems.kyc_disk');
        $userId = $request->user()->id;

        $path = $request->file('license_document')->store("kyc/{$userId}", $disk);

        $extracted = $ocr->extractLicenseInfo($path, $disk);

        return response()->json([
            ...$extracted,
            'license_document_path' => $path,
        ]);
    }

    public function submitKyc(SubmitKycRequest $request)
    {
        $user = $request->user();

        $profile = DriverProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                ...$request->only('license_number', 'license_expiry', 'license_document_path'),
                'kyc_status' => DriverProfile::STATUS_SUBMITTED,
                'kyc_rejection_reason' => null,
            ],
        );

        $profile = $this->kycReviewService->maybeAutoReview($profile);

        return new DriverProfileResource($profile);
    }
}
