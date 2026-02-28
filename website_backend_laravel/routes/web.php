<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocsController;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/track-download', function (Request $request) {
    DB::table('download_logs')->insert([
        'ip_address' => $request->ip(),
        'user_agent' => $request->userAgent(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    return response()->json(['status' => 'success']);
});

// Documentation Routes
Route::get('/docs/{page?}', [DocsController::class, 'show'])->name('docs.show');
