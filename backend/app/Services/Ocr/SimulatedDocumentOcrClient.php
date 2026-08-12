<?php

namespace App\Services\Ocr;

use App\Contracts\DocumentOcrClient;
use App\Models\InsurancePolicy;

/**
 * No OCR/document-scanning vendor is integrated yet, so this returns
 * plausible-looking values instead of actually reading the uploaded
 * photos — same spirit as AbstractSimulatedInsuranceProviderClient.
 * Swapping in a real vendor later (Google Vision, AWS Textract, a local
 * provider) means adding one class that implements DocumentOcrClient and
 * flipping OCR_DRIVER in .env; nothing else in the app needs to change.
 */
class SimulatedDocumentOcrClient implements DocumentOcrClient
{
    private const MAKES_MODELS = [
        ['make' => 'Toyota', 'model' => 'Corolla'],
        ['make' => 'Hyundai', 'model' => 'Accent'],
        ['make' => 'Peugeot', 'model' => '308'],
        ['make' => 'Renault', 'model' => 'Logan'],
        ['make' => 'Kia', 'model' => 'Rio'],
    ];

    private const AGE_BRACKETS = [
        InsurancePolicy::AGE_BRACKET_UNDER_5,
        InsurancePolicy::AGE_BRACKET_FROM_5_TO_10,
        InsurancePolicy::AGE_BRACKET_OVER_10,
    ];

    public function extractVehicleInfo(string $frontPath, ?string $backPath, string $disk): array
    {
        $vehicle = self::MAKES_MODELS[array_rand(self::MAKES_MODELS)];

        return [
            'make' => $vehicle['make'],
            'model' => $vehicle['model'],
            'plate_number' => 'DK-'.random_int(1000, 9999).'-'.chr(random_int(65, 90)).chr(random_int(65, 90)),
            'power_cv' => random_int(4, 9),
            'seats' => random_int(4, 5),
            'vehicle_age_bracket' => self::AGE_BRACKETS[array_rand(self::AGE_BRACKETS)],
        ];
    }
}
