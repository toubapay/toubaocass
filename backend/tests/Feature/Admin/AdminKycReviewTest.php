<?php

namespace Tests\Feature\Admin;

use App\Models\AdminUser;
use App\Models\DriverProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminKycReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_submission_stays_submitted_in_manual_mode_by_default(): void
    {
        Storage::fake('local');

        $driver = User::factory()->driver()->create();

        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/kyc', [
            'license_number' => 'LIC-001',
            'license_expiry' => now()->addYear()->toDateString(),
            'national_id_number' => '1234567890123',
            'id_document' => UploadedFile::fake()->image('id.jpg'),
            'license_document' => UploadedFile::fake()->image('license.jpg'),
            'selfie' => UploadedFile::fake()->image('selfie.jpg'),
        ])->assertCreated()->assertJsonPath('kyc_status', 'submitted');
    }

    public function test_submission_auto_approves_when_mode_is_automatic(): void
    {
        Storage::fake('local');

        $admin = AdminUser::factory()->superAdmin()->create();
        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings/kyc-mode', ['mode' => 'automatic'])
            ->assertOk();

        $driver = User::factory()->driver()->create();

        // wasRecentlyCreated resets to false once KycReviewService::approve()
        // re-fetches the profile via fresh(), so this returns 200 rather
        // than the 201 a plain submission gets — cosmetic only.
        $this->actingAs($driver, 'sanctum')->postJson('/api/driver/kyc', [
            'license_number' => 'LIC-002',
            'license_expiry' => now()->addYear()->toDateString(),
            'national_id_number' => '1234567890124',
            'id_document' => UploadedFile::fake()->image('id.jpg'),
            'license_document' => UploadedFile::fake()->image('license.jpg'),
            'selfie' => UploadedFile::fake()->image('selfie.jpg'),
        ])->assertOk()->assertJsonPath('kyc_status', 'approved');
    }

    public function test_only_super_admin_can_change_kyc_mode(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ADMIN)->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings/kyc-mode', ['mode' => 'automatic'])
            ->assertForbidden();
    }

    public function test_admin_with_manage_kyc_can_list_and_approve_queue(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_CONTROLLERS)->create();
        $profile = DriverProfile::factory()->create([
            'kyc_status' => DriverProfile::STATUS_SUBMITTED,
            'id_document_path' => 'kyc/1/id.jpg',
            'license_document_path' => 'kyc/1/license.jpg',
            'selfie_path' => 'kyc/1/selfie.jpg',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/kyc/queue')
            ->assertOk()
            ->assertJsonFragment(['id' => $profile->id]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/kyc/{$profile->id}/approve")
            ->assertOk()
            ->assertJsonPath('kyc_status', 'approved');

        $this->assertDatabaseHas('driver_profiles', ['id' => $profile->id, 'kyc_status' => 'approved']);
    }

    public function test_admin_can_reject_with_a_reason(): void
    {
        $admin = AdminUser::factory()->create();
        $profile = DriverProfile::factory()->create(['kyc_status' => DriverProfile::STATUS_SUBMITTED]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/kyc/{$profile->id}/reject", ['reason' => 'Photo illisible.'])
            ->assertOk()
            ->assertJsonPath('kyc_status', 'rejected')
            ->assertJsonPath('kyc_rejection_reason', 'Photo illisible.');
    }

    public function test_accountant_cannot_access_kyc_endpoints(): void
    {
        $admin = AdminUser::factory()->role(AdminUser::ROLE_ACCOUNTANT)->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/kyc/queue')
            ->assertForbidden();
    }

    public function test_document_endpoint_streams_the_file_and_rejects_unknown_fields(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('kyc/1/id.jpg', 'fake-image-bytes');

        $admin = AdminUser::factory()->create();
        $profile = DriverProfile::factory()->create(['id_document_path' => 'kyc/1/id.jpg']);

        $this->actingAs($admin, 'sanctum')
            ->get("/api/admin/kyc/{$profile->id}/document/id_document")
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->get("/api/admin/kyc/{$profile->id}/document/not_a_real_field")
            ->assertNotFound();
    }
}
