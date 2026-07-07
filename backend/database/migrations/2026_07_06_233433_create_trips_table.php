<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('car_id')->constrained('cars')->cascadeOnDelete();
            $table->foreignId('origin_city_id')->constrained('cities');
            $table->foreignId('destination_city_id')->constrained('cities');
            $table->date('departure_date');
            $table->time('departure_time');
            $table->unsignedInteger('fare');
            $table->enum('ride_type', ['standard', 'comfort', 'xl'])->default('standard');
            $table->unsignedTinyInteger('total_seats');
            $table->unsignedTinyInteger('available_seats');
            $table->enum('status', ['scheduled', 'full', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['origin_city_id', 'destination_city_id', 'departure_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
