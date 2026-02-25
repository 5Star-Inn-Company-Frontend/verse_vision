<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('request_type'); // transcription, translation, scripture_detection
            $table->string('model'); // whisper-1, gpt-4o, etc.
            $table->integer('input_tokens')->default(0);
            $table->integer('output_tokens')->default(0);
            $table->integer('duration_ms')->default(0);
            $table->float('audio_duration_sec')->nullable(); // Added from usage tracking update
            $table->text('prompt_snippet')->nullable(); // Store truncated prompt for debugging (beware PII)
            $table->json('meta')->nullable(); // Additional metadata
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_logs');
    }
};
