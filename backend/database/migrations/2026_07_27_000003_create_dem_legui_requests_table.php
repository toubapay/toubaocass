<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dem_legui_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rider_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('pickup_latitude', 10, 7);
            $table->decimal('pickup_longitude', 10, 7);
            $table->string('pickup_address')->nullable();
            $table->foreignId('destination_city_id')->constrained('cities');
            $table->string('destination_address')->nullable();
            $table->unsignedTinyInteger('seats_requested')->default(1);
            $table->unsignedInteger('fare_total');
            $table->enum('payment_method', ['cash', 'wallet']);
            $table->enum('status', ['pending', 'matched', 'cancelled', 'expired'])->default('pending');
            $table->unsignedInteger('commission_amount')->nullable();
            $table->decimal('commission_rate', 5, 2)->nullable();
            $table->foreignId('dem_legui_trip_id')->nullable()->constrained('dem_legui_trips')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dem_legui_requests');
    }
};
