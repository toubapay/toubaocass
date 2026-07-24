<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anando_ride_id')->constrained('anando_rides')->cascadeOnDelete();
            $table->foreignId('rater_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ratee_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('score');
            $table->string('comment', 500)->nullable();
            $table->timestamps();

            $table->unique(['anando_ride_id', 'rater_id', 'ratee_id']);
            $table->index('ratee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
