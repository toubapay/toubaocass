<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets any authenticated user (not just a driver with a registered fleet
 * Car) buy insurance for a vehicle described directly on the policy — the
 * "scan your carte grise" flow reachable from Profile. car_id becomes
 * optional; when it's null, the vehicle_* columns below are the source of
 * truth instead (mirrors how bookings/deliveries snapshot fare/fee rather
 * than only ever pointing at a live record).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('insurance_policies', function (Blueprint $table) {
            $table->dropForeign(['car_id']);
        });

        Schema::table('insurance_policies', function (Blueprint $table) {
            $table->foreignId('car_id')->nullable()->change();

            $table->enum('vehicle_category', ['car', 'motorcycle'])->nullable()->after('car_id');
            $table->string('vehicle_make')->nullable()->after('vehicle_category');
            $table->string('vehicle_model')->nullable()->after('vehicle_make');
            $table->string('vehicle_plate_number')->nullable()->after('vehicle_model');
            $table->unsignedInteger('vehicle_power_cv')->nullable()->after('vehicle_plate_number');
            $table->unsignedTinyInteger('vehicle_seats')->nullable()->after('vehicle_power_cv');
            $table->enum('vehicle_age_bracket', ['under_5', 'from_5_to_10', 'over_10'])->nullable()->after('vehicle_seats');
            $table->enum('vehicle_usage_type', ['personal', 'professional'])->nullable()->after('vehicle_age_bracket');
            $table->string('carte_grise_front_path')->nullable()->after('vehicle_usage_type');
            $table->string('carte_grise_back_path')->nullable()->after('carte_grise_front_path');
        });

        Schema::table('insurance_policies', function (Blueprint $table) {
            $table->foreign('car_id')->references('id')->on('cars')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('insurance_policies', function (Blueprint $table) {
            $table->dropForeign(['car_id']);
            $table->dropColumn([
                'vehicle_category', 'vehicle_make', 'vehicle_model', 'vehicle_plate_number',
                'vehicle_power_cv', 'vehicle_seats', 'vehicle_age_bracket', 'vehicle_usage_type',
                'carte_grise_front_path', 'carte_grise_back_path',
            ]);
        });

        Schema::table('insurance_policies', function (Blueprint $table) {
            $table->foreignId('car_id')->nullable(false)->change();
            $table->foreign('car_id')->references('id')->on('cars')->cascadeOnDelete();
        });
    }
};
