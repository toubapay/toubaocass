<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | KYC Document Disk
    |--------------------------------------------------------------------------
    |
    | Driver KYC documents (ID, driving license, selfie) contain personal
    | data and must never be served from a public/world-readable disk. This
    | is kept separate from the default disk above, which serves public
    | assets like car photos. Defaults to the private "local" disk (no
    | public URL) in development; set to "kyc" (private S3/R2 bucket) in
    | production.
    |
    */

    'kyc_disk' => env('KYC_FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        // Public bucket — car photos and any other rider/driver-facing
        // assets. Point FILESYSTEM_DISK=s3 at this in production so uploads
        // survive redeploys on ephemeral hosts (e.g. Railway). Works with
        // real AWS S3 as-is (leave AWS_ENDPOINT blank); for an S3-compatible
        // provider like Cloudflare R2 instead, set AWS_ENDPOINT to its
        // endpoint URL, AWS_DEFAULT_REGION=auto, and
        // AWS_USE_PATH_STYLE_ENDPOINT=true.
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

        // Private bucket — driver KYC documents (ID, driving license,
        // selfie). Uses the same credentials/provider as the 's3' disk
        // above but a separate, non-public bucket. No "url" is configured
        // on purpose; these should only ever be read via
        // Storage::disk('kyc')->temporaryUrl() from an authenticated/admin
        // context, never exposed directly to the mobile apps.
        'kyc' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_KYC_BUCKET'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
