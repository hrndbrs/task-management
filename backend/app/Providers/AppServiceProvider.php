<?php

namespace App\Providers;

use App\Contracts\VirusScanner;
use App\Services\EicarVirusScanner;
use App\Services\VideoTranscoder;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(VirusScanner::class, EicarVirusScanner::class);

        $this->app->bind(VideoTranscoder::class, fn () => new VideoTranscoder(
            ffmpeg: config('attachments.video.ffmpeg'),
            ffprobe: config('attachments.video.ffprobe'),
            segmentSeconds: config('attachments.video.segment_seconds'),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function ($request) {
            return Limit::perMinute(5)->by(Str::transliterate(
                Str::lower($request->string('email')).'|'.$request->ip()
            ));
        });
    }
}
