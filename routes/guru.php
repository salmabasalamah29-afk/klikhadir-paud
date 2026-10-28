<?php

use App\Http\Controllers\Export\AttendanceExportController;
use App\Http\Controllers\Guru\AbsensiController;
use App\Http\Controllers\Guru\DataAbsensiController;
use App\Http\Controllers\Guru\ExportPageController;
use App\Http\Controllers\Guru\LihatPresensiController;
use App\Http\Controllers\Guru\PresensiDiriController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProfilController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'role:guru', 'check.password.status'])->prefix('guru')->name('guru.')->group(function () {
    Route::get('profil', [ProfilController::class, 'show'])->name('profil');

    Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');
    Route::post('absensi', [AbsensiController::class, 'store'])->name('absensi.store');
    Route::post('absensi/bulk', [AbsensiController::class, 'bulkStore'])->name('absensi.bulk');
    Route::delete('absensi/{absensi}', [AbsensiController::class, 'destroy'])->name('absensi.destroy');

    Route::get('data-absensi', [DataAbsensiController::class, 'index'])->name('data-absensi.index');

    Route::get('export', [ExportPageController::class, 'index'])->name('export.index');
    Route::get('export/download', [ExportPageController::class, 'export'])->name('export.download');

    Route::get('presensi-diri', [PresensiDiriController::class, 'index'])->name('presensi-diri.index');
    Route::post('presensi-diri', [PresensiDiriController::class, 'store'])->name('presensi-diri.store');
    Route::delete('presensi-diri/{presensi}', [PresensiDiriController::class, 'destroy'])->name('presensi-diri.destroy');

    Route::get('lihat-presensi', [LihatPresensiController::class, 'index'])->name('lihat-presensi.index');

    Route::get('ubah-sandi', [PasswordResetController::class, 'showChange'])->name('password.change.show');
    Route::post('ubah-sandi', [PasswordResetController::class, 'updateChange'])->name('password.change');

    Route::get('export-absensi', [AttendanceExportController::class, 'export'])->name('export-absensi');
});
