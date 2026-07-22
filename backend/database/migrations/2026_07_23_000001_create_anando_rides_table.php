<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anando_rides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('origin_city_id')->constrained('cities');
            $table->foreignId('destination_city_id')->constrained('cities');
            $table->string('departure_point')->nullable();
            $table->decimal('departure_latitude', 10, 7)->nullable();
            $table->decimal('departure_longitude', 10, 7)->nullable();
            $table->timestamp('departure_at');
            $table->unsignedInteger('price_per_seat');
            $table->unsignedTinyInteger('total_seats');
            $table->unsignedTinyInteger('available_seats');
            $table->string('vehicle_info')->nullable();
            $table->string('notes')->nullable();
            $table->enum('status', ['open', 'full', 'cancelled', 'completed'])->default('open');
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'origin_city_id', 'destination_city_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anando_rides');
    }
};
