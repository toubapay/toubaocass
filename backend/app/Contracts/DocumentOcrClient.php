<?php

namespace App\Contracts;

interface DocumentOcrClient
{
    /**
     * Extracts vehicle info from a scanned carte grise (front, and
     * optionally back). $frontPath/$backPath are storage paths on $disk
     * (same disk the caller just stored the uploads on).
     *
     * @return array{make: ?string, model: ?string, plate_number: ?string, power_cv: ?int, seats: ?int, vehicle_age_bracket: ?string}
     */
    public function extractVehicleInfo(string $frontPath, ?string $backPath, string $disk): array;

    /**
     * Extracts a driver's license number and expiry date from a scanned
     * photo. $path is a storage path on $disk (same disk the caller just
     * stored the upload on).
     *
     * @return array{license_number: ?string, license_expiry: ?string}
     */
    public function extractLicenseInfo(string $path, string $disk): array;
}
