<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

/**
 * Stores an uploaded file, shrinking it first if it's an image. Uploaded
 * car/profile/KYC photos routinely come straight off a phone camera at
 * several megabytes — storing them as-is bloats disk usage and page-load
 * weight for no visual benefit at the sizes this app ever displays them.
 * Non-image files (a PDF slipping through on a disk that accepts them) are
 * stored untouched, since there's nothing to compress.
 */
class CompressedImageUpload
{
    private const MAX_DIMENSION = 1600;

    private const JPEG_QUALITY = 80;

    public static function store(UploadedFile $file, string $path, ?string $disk = null): string
    {
        if (! str_starts_with((string) $file->getMimeType(), 'image/')) {
            return $file->store($path, $disk);
        }

        $image = ImageManager::gd()->read($file->getRealPath());

        // Never upscale a smaller original — scaleDown leaves it as-is if
        // both dimensions already fit within the target.
        $image->scaleDown(width: self::MAX_DIMENSION, height: self::MAX_DIMENSION);

        $encoded = $image->toJpeg(self::JPEG_QUALITY);

        $filename = Str::uuid()->toString().'.jpg';
        $storedPath = trim($path, '/').'/'.$filename;

        Storage::disk($disk)->put($storedPath, (string) $encoded);

        return $storedPath;
    }
}
