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
}
