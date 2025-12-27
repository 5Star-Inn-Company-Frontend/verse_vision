<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\User;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\AiController;
use App\Http\Middleware\AuthTokenMiddleware;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Simple Token Middleware
Route::middleware(AuthTokenMiddleware::class)->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    
    Route::get('/plans', [SubscriptionController::class, 'plans']);
    Route::post('/subscription/initialize', [SubscriptionController::class, 'initialize']);
    Route::post('/subscription/verify', [SubscriptionController::class, 'verify']);
    
    Route::get('/sync/settings', [SyncController::class, 'getSettings']);
    Route::post('/sync/settings', [SyncController::class, 'updateSettings']);
    
    Route::post('/ai/transcribe', [AiController::class, 'transcribe']);
    Route::post('/ai/scripture/detect', [AiController::class, 'detectScripture']);
    Route::post('/ai/translate', [AiController::class, 'translate']);
    Route::post('/ai/scripture/text', [AiController::class, 'getScriptureText']);
    Route::post('/ai/lyrics/fetch', [AiController::class, 'fetchLyrics']);
});
