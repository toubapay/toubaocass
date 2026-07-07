<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('license_number')->nullable();
            $table->date('license_expiry')->nullable();
            $table->string('national_id_number')->nullable();
            $table->string('id_document_path')->nullable();
            $table->string('license_document_path')->nullable();
            $table->string('selfie_path')->nullable();
            $table->enum('kyc_status', ['pending', 'submitted', 'approved', 'rejected'])->default('pending');
            $table->string('kyc_rejection_reason')->nullable();
            $table->decimal('rating', 3, 2)->default(5.00);
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_profiles');
    }
};
