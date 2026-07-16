<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RejectKycRequest;
use App\Http\Resources\Admin\KycProfileResource;
use App\Models\DriverProfile;
use App\Services\KycReviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class KycController extends Controller
{
    /**
     * Document fields exposed for viewing, mapped to their storage column —
     * an explicit allow-list so the {field} route parameter can never be
     * used to read an arbitrary model attribute.
     */
    private const DOCUMENT_COLUMNS = [
        'id_document' => 'id_document_path',
        'license_document' => 'license_document_path',
        'selfie' => 'selfie_path',
    ];

    public function __construct(private readonly KycReviewService $kycReviewService) {}

    public function queue(Request $request)
    {
        $profiles = DriverProfile::query()
            ->with('user')
            ->where('kyc_status', DriverProfile::STATUS_SUBMITTED)
            ->oldest('updated_at')
            ->paginate(20);

        return KycProfileResource::collection($profiles);
    }

    public function show(DriverProfile $driverProfile)
    {
        return new KycProfileResource($driverProfile->load('user'));
    }

    public function document(DriverProfile $driverProfile, string $field): Response
    {
        abort_unless(array_key_exists($field, self::DOCUMENT_COLUMNS), 404);

        $path = $driverProfile->{self::DOCUMENT_COLUMNS[$field]};
        abort_unless(filled($path), 404);

        return Storage::disk(config('filesystems.kyc_disk'))->response($path);
    }

    public function approve(Request $request, DriverProfile $driverProfile)
    {
        $profile = $this->kycReviewService->approve($driverProfile, $request->user());

        return new KycProfileResource($profile->load('user'));
    }

    public function reject(RejectKycRequest $request, DriverProfile $driverProfile)
    {
        $profile = $this->kycReviewService->reject($driverProfile, $request->string('reason'), $request->user());

        return new KycProfileResource($profile->load('user'));
    }
}
