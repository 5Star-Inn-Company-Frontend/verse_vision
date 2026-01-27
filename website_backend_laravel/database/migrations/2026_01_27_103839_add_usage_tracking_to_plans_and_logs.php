<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->integer('transcription_minutes_limit')->default(0)->after('translation_limit');
        });

        Schema::table('ai_logs', function (Blueprint $table) {
            $table->float('audio_duration_sec')->nullable()->after('duration_ms');
        });

        // Seed default limits for existing plans
        DB::table('plans')->where('slug', 'starter')->update(['transcription_minutes_limit' => 5]); // 5 mins demo
        DB::table('plans')->where('slug', 'standard')->update(['transcription_minutes_limit' => 120]); // 2 hours
        DB::table('plans')->where('slug', 'professional')->update(['transcription_minutes_limit' => 600]); // 10 hours
        DB::table('plans')->where('slug', 'enterprise')->update(['transcription_minutes_limit' => -1]); // Unlimited
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('transcription_minutes_limit');
        });

        Schema::table('ai_logs', function (Blueprint $table) {
            $table->dropColumn('audio_duration_sec');
        });
    }
};
