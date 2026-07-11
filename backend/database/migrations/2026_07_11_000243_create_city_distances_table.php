<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('city_distances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('origin_city_id')->constrained('cities')->cascadeOnDelete();
            $table->foreignId('destination_city_id')->constrained('cities')->cascadeOnDelete();
            $table->float('distance_km')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->string('source', 20);
            $table->timestamps();

            $table->unique(['origin_city_id', 'destination_city_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('city_distances');
    }
};
