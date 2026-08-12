<?php

namespace App\Http\Controllers\Api;

use App\Contracts\DocumentOcrClient;
use App\Http\Controllers\Controller;
use App\Http\Requests\Driver\PurchaseInsuranceRequest;
use App\Http\Requests\Driver\QuoteInsuranceRequest;
use App\Http\Requests\PurchaseVehicleInsuranceRequest;
use App\Http\Requests\QuoteVehicleInsuranceRequest;
use App\Http\Requests\ScanVehicleDocumentRequest;
use App\Http\Resources\InsurancePolicyResource;
use App\Http\Resources\InsuranceProviderResource;
use App\Models\Car;
use App\Models\InsuranceProvider;
use App\Services\Insurance\InsuranceComparisonService;
use Illuminate\Http\Request;

class InsuranceController extends Controller
{
    public function __construct(private readonly InsuranceComparisonService $comparison) {}

    public function providers()
    {
        return InsuranceProviderResource::collection(
            InsuranceProvider::where('is_active', true)->orderBy('name')->get()
        );
    }

    public function quote(QuoteInsuranceRequest $request)
    {
        $car = Car::findOrFail($request->validated('car_id'));
        $this->authorize('update', $car);

        return response()->json([
            'quotes' => $this->comparison->compare($car, $request->validated('coverage_type')),
        ]);
    }

    public function purchase(PurchaseInsuranceRequest $request)
    {
        $car = Car::findOrFail($request->validated('car_id'));
        $this->authorize('update', $car);

        $provider = InsuranceProvider::where('is_active', true)->findOrFail($request->validated('provider_id'));

        $policy = $this->comparison->purchase($car, $provider, $request->validated());

        return new InsurancePolicyResource($policy);
    }

    public function index(Request $request)
    {
        $policies = $request->user()->insurancePolicies()
            ->with(['car', 'provider'])
            ->latest()
            ->paginate(20);

        return InsurancePolicyResource::collection($policies);
    }

    /**
     * Scans a carte grise (front, optionally back) and returns extracted
     * vehicle info + the stored paths — nothing is persisted yet, the
     * client echoes the paths back on the purchase step. Open to any
     * authenticated user (rider or driver), unlike the car-based routes
     * above which require an existing fleet Car.
     */
    public function scanVehicleDocument(ScanVehicleDocumentRequest $request, DocumentOcrClient $ocr)
    {
        $disk = config('filesystems.kyc_disk');
        $userId = $request->user()->id;

        $frontPath = $request->file('carte_grise_front')->store("insurance-documents/{$userId}", $disk);
        $backPath = $request->hasFile('carte_grise_back')
            ? $request->file('carte_grise_back')->store("insurance-documents/{$userId}", $disk)
            : null;

        $extracted = $ocr->extractVehicleInfo($frontPath, $backPath, $disk);

        return response()->json([
            ...$extracted,
            'carte_grise_front_path' => $frontPath,
            'carte_grise_back_path' => $backPath,
        ]);
    }

    public function quoteForVehicle(QuoteVehicleInsuranceRequest $request)
    {
        return response()->json([
            'quotes' => $this->comparison->compareForVehicle($request->validated(), $request->validated('coverage_type')),
        ]);
    }

    public function purchaseForVehicle(PurchaseVehicleInsuranceRequest $request)
    {
        $provider = InsuranceProvider::where('is_active', true)->findOrFail($request->validated('provider_id'));

        $policy = $this->comparison->purchaseForVehicle(
            $request->user(),
            $request->validated(),
            $provider,
            $request->validated(),
        );

        return new InsurancePolicyResource($policy);
    }

    public function myPolicies(Request $request)
    {
        $policies = $request->user()->insurancePolicies()
            ->with(['car', 'provider'])
            ->latest()
            ->paginate(20);

        return InsurancePolicyResource::collection($policies);
    }
}
