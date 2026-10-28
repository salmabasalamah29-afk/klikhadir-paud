<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // Auto-fix schema Postgres if pending (drop status check & ensure arsip_presensis columns)
        if (app()->environment('production')) {
            try {
                if (DB::getDriverName() === 'pgsql') {
                    DB::statement('ALTER TABLE absensis DROP CONSTRAINT IF EXISTS absensis_status_check');
                    DB::statement('ALTER TABLE arsip_presensis ADD COLUMN IF NOT EXISTS siswa_nisn VARCHAR(20) NULL');
                    DB::statement('ALTER TABLE arsip_presensis ADD COLUMN IF NOT EXISTS siswa_nama VARCHAR(255) NULL');
                    DB::statement('ALTER TABLE arsip_presensis ADD COLUMN IF NOT EXISTS siswa_foto_url VARCHAR(255) NULL');
                }
            } catch (\Throwable $e) {
            }
        }

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
