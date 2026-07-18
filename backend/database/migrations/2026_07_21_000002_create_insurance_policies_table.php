<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insurance_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('car_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('insurance_provider_id')->constrained()->restrictOnDelete();
            $table->enum('coverage_type', ['tiers_simple', 'tiers_collision', 'tous_risques']);
            $table->string('plan_name');
            $table->unsignedInteger('annual_premium');
            $table->unsignedInteger('commission_amount')->nullable();
            $table->decimal('commission_rate', 5, 2)->nullable();
            $table->string('policy_number')->unique();
            $table->date('starts_at');
            $table->date('ends_at');
            $table->enum('status', ['active', 'expired', 'cancelled'])->default('active');
            $table->timestamps();

            $table->index(['car_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_policies');
    }
};
