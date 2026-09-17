<?php

namespace Tests\Feature\Driver;

use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KycTest extends TestCase
{
    use RefreshDatabase;

    public function test_scanning_a_license_stores_it_and_returns_extracted_fields(): void
    {
        Storage::fake('local');
        $driver = User::factory()->driver()->create();

        $response = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/kyc/scan', ['license_document' => UploadedFile::fake()->image('license.jpg')])
            ->assertOk();

        $response->assertJsonStructure(['license_number', 'license_expiry', 'license_document_path']);
        $path = $response->json('license_document_path');
        $this->assertStringStartsWith("kyc/{$driver->id}/", $path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_submitting_kyc_only_needs_the_license_number_expiry_and_scanned_path(): void
    {
        Storage::fake('local');
        $driver = User::factory()->driver()->create();

        $scan = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/kyc/scan', ['license_document' => UploadedFile::fake()->image('license.jpg')])
            ->assertOk();

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/kyc', [
            'license_number' => 'SN12345678',
            'license_expiry' => now()->addYear()->toDateString(),
            'license_document_path' => $scan->json('license_document_path'),
        ])->assertCreated()->assertJsonPath('kyc_status', 'submitted');

        $this->assertDatabaseHas('driver_profiles', [
            'user_id' => $driver->id,
            'license_number' => 'SN12345678',
            'license_document_path' => $scan->json('license_document_path'),
            // No ID card / selfie collected by this simplified form.
            'id_document_path' => null,
            'selfie_path' => null,
        ]);
    }

    public function test_submitting_kyc_rejects_a_document_path_belonging_to_another_driver(): void
    {
        Storage::fake('local');
        $driver = User::factory()->driver()->create();
        $otherDriver = User::factory()->driver()->create();

        $scan = $this->actingAs($otherDriver, 'sanctum')
            ->postJson('/api/driver/kyc/scan', ['license_document' => UploadedFile::fake()->image('license.jpg')])
            ->assertOk();

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/kyc', [
            'license_number' => 'SN99999999',
            'license_expiry' => now()->addYear()->toDateString(),
            'license_document_path' => $scan->json('license_document_path'),
        ])->assertUnprocessable();
    }

    public function test_submitting_kyc_with_a_path_outside_the_drivers_kyc_prefix_is_rejected(): void
    {
        $driver = User::factory()->driver()->create();

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/kyc', [
            'license_number' => 'SN00000000',
            'license_expiry' => now()->addYear()->toDateString(),
            'license_document_path' => '../../etc/passwd',
        ])->assertUnprocessable();
    }

    public function test_auto_approval_only_needs_the_license_document_and_a_future_expiry(): void
    {
        Storage::fake('local');
        $driver = User::factory()->driver()->create();

        $scan = $this->actingAs($driver, 'sanctum')
            ->postJson('/api/driver/kyc/scan', ['license_document' => UploadedFile::fake()->image('license.jpg')])
            ->assertOk();

        $profile = DriverProfile::make([
            'license_document_path' => $scan->json('license_document_path'),
            'license_expiry' => now()->addYear(),
        ]);

        $this->assertTrue(app(\App\Services\KycReviewService::class)->passesAutomaticRule($profile));
    }
}
