<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ChunkedUploadController;
use App\Http\Controllers\TaskAttachmentController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:api')->group(function () {
    Route::apiResource('tasks', TaskController::class);

    Route::post('tasks/{task}/attachments', [TaskAttachmentController::class, 'store'])->name('tasks.attachments.store');
    Route::get('attachments/{attachment}/download', [TaskAttachmentController::class, 'download'])->name('attachments.download');
    Route::get('attachments/{attachment}/thumbnail', [TaskAttachmentController::class, 'thumbnail'])->name('attachments.thumbnail');
    Route::delete('attachments/{attachment}', [TaskAttachmentController::class, 'destroy'])->name('attachments.destroy');

    Route::post('tasks/{task}/attachments/uploads', [ChunkedUploadController::class, 'store'])->name('tasks.attachments.uploads.store');
    Route::get('uploads/{upload}', [ChunkedUploadController::class, 'show'])->name('uploads.show');
    Route::post('uploads/{upload}/chunks/{index}', [ChunkedUploadController::class, 'storeChunk'])->whereNumber('index')->name('uploads.chunks.store');
    Route::post('uploads/{upload}/complete', [ChunkedUploadController::class, 'complete'])->name('uploads.complete');
    Route::delete('uploads/{upload}', [ChunkedUploadController::class, 'destroy'])->name('uploads.destroy');
});
