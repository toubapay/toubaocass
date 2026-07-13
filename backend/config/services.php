<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sms' => [
        'driver' => env('SMS_DRIVER', 'log'),
        'twilio' => [
            'sid' => env('TWILIO_SID'),
            'token' => env('TWILIO_TOKEN'),
            'from' => env('TWILIO_FROM'),
        ],
        'promobile' => [
            'token' => env('PROMOBILE_TOKEN'),
            'from' => env('PROMOBILE_FROM', 'Ocass'),
        ],
    ],

    'push' => [
        'driver' => env('PUSH_DRIVER', 'log'),
        'fcm' => [
            'project_id' => env('FCM_PROJECT_ID'),
            // Defaults to where docker/entrypoint.sh writes FCM_CREDENTIALS_JSON
            // at container boot (a service-account key can't be committed to
            // git, so it's never a real file in the repo) — override with
            // FCM_CREDENTIALS_PATH only if you're mounting the file yourself.
            'credentials_path' => env('FCM_CREDENTIALS_PATH', storage_path('app/fcm-credentials.json')),
        ],
    ],

    'google_maps' => [
        // Server-side key for the Distance Matrix API — deliberately separate
        // from the client apps' GOOGLE_MAPS_API_KEY (that one is restricted
        // to Android/iOS app bundles for map tile rendering; this one should
        // be restricted to this server's IP and the Distance Matrix API
        // only). Route distances fall back to a straight-line estimate when
        // this isn't set.
        'server_key' => env('GOOGLE_MAPS_SERVER_KEY'),
    ],

    'otp' => [
        'ttl_minutes' => env('OTP_TTL_MINUTES', 5),
        'length' => env('OTP_LENGTH', 6),
        'max_attempts' => env('OTP_MAX_ATTEMPTS', 5),
        // When set (non-production convenience), skips sending a real SMS and
        // accepts this fixed code for every OTP request/verify cycle.
        'bypass_code' => env('OTP_BYPASS_CODE'),
    ],

    'delivery' => [
        // FCFA, integer (matches trips.fare's no-decimals convention). Fee is
        // computed as base_fee + fee_per_km * straight-line distance.
        'fee_per_km' => env('DELIVERY_FEE_PER_KM', 150),
        'base_fee' => env('DELIVERY_BASE_FEE', 500),
    ],

];
