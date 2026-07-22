<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anando_ride_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anando_ride_id')->constrained('anando_rides')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('seats_booked');
            $table->unsignedInteger('price_total');
            $table->enum('payment_method', ['cash', 'wallet'])->default('cash');
            $table->unsignedInteger('commission_amount')->nullable();
            $table->decimal('commission_rate', 5, 2)->nullable();
            $table->enum('status', ['confirmed', 'cancelled'])->default('confirmed');
            $table->timestamps();

            $table->index(['anando_ride_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anando_ride_bookings');
    }
};
