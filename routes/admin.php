<?php

use App\Http\Controllers\Admin\AdminController;
use App\Http\Controllers\Admin\AlumniController;
use App\Http\Controllers\Admin\ArsipController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\GuruController;
use App\Http\Controllers\Admin\ImportController;
use App\Http\Controllers\Admin\KelasController;
use App\Http\Controllers\Admin\ResetPasswordController;
use App\Http\Controllers\Admin\SiswaController;
use App\Http\Controllers\Admin\StatistikController;
use App\Http\Controllers\Admin\TahunAjaranController;
use App\Http\Controllers\Export\AttendanceExportController;
use App\Http\Controllers\Guru\ExportPageController;
use App\Http\Controllers\PasswordResetController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', 'role:admin', 'check.password.status'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('statistik/{status}', [StatistikController::class, 'index'])->name('statistik');

    Route::get('tambah-admin', [AdminController::class, 'tambahAdmin'])->name('tambah-admin');
    Route::post('admin', [AdminController::class, 'store'])->name('admin.store');
    Route::put('admin/{admin}', [AdminController::class, 'update'])->name('admin.update');
    Route::delete('admin/{admin}', [AdminController::class, 'destroy'])->name('admin.destroy');
    Route::post('admin/{admin}/reset-password', [AdminController::class, 'resetPassword'])->name('admin.resetPassword');

    Route::get('guru', [GuruController::class, 'index'])->name('guru.index');
    Route::get('guru/{guru}/profil', [GuruController::class, 'show'])->name('guru.profil');
    Route::post('guru', [GuruController::class, 'store'])->name('guru.store');
    Route::put('guru/{guru}', [GuruController::class, 'update'])->name('guru.update');
    Route::delete('guru/{guru}', [GuruController::class, 'destroy'])->name('guru.destroy');
    Route::post('guru/{guru}/reset-password', [ResetPasswordController::class, 'resetGuru'])->name('guru.resetPassword');

    Route::get('siswa', [SiswaController::class, 'index'])->name('siswa.index');
    Route::get('siswa/{siswa}/profil', [SiswaController::class, 'show'])->name('siswa.profil');
    Route::post('siswa', [SiswaController::class, 'store'])->name('siswa.store');
    Route::put('siswa/{siswa}', [SiswaController::class, 'update'])->name('siswa.update');
    Route::delete('siswa/{siswa}', [SiswaController::class, 'destroy'])->name('siswa.destroy');
    Route::post('siswa/{siswa}/reset-password', [ResetPasswordController::class, 'resetSiswa'])->name('siswa.resetPassword');

    Route::get('tahun-ajaran', [TahunAjaranController::class, 'index'])->name('tahun-ajaran.index');
    Route::post('tahun-ajaran', [TahunAjaranController::class, 'store'])->name('tahun-ajaran.store');
    Route::put('tahun-ajaran/{tahun_ajaran}', [TahunAjaranController::class, 'update'])->name('tahun-ajaran.update');
    Route::delete('tahun-ajaran/{tahun_ajaran}', [TahunAjaranController::class, 'destroy'])->name('tahun-ajaran.destroy');
    Route::post('tahun-ajaran/{tahun_ajaran}/activate', [TahunAjaranController::class, 'activate'])->name('tahun-ajaran.activate');
    Route::post('tahun-ajaran/naik-kelas', [TahunAjaranController::class, 'naikKelas'])->name('tahun-ajaran.naik-kelas');
    Route::get('tahun-ajaran/{tahunAjaran}/arsip', [ArsipController::class, 'tingkat'])->name('tahun-ajaran.arsip');
    Route::get('tahun-ajaran/{tahunAjaran}/arsip/kelas/{kelas}/detail', [ArsipController::class, 'detail'])->name('tahun-ajaran.arsip.detail');
    Route::get('tahun-ajaran/{tahunAjaran}/arsip/kelas/{kelas}/export', [ArsipController::class, 'export'])->name('tahun-ajaran.arsip.export');
    Route::get('tahun-ajaran/{tahunAjaran}/arsip/{jenjang}/{jurusan}', [ArsipController::class, 'kelas'])->name('tahun-ajaran.arsip.kelas');

    Route::get('alumni', [AlumniController::class, 'tahun'])->name('alumni.tahun');
    Route::get('alumni/{tahunAjaran}', [AlumniController::class, 'kelas'])->name('alumni.kelas');
    Route::get('alumni/{tahunAjaran}/kelas/{kelas}', [AlumniController::class, 'detail'])->name('alumni.detail');

    Route::get('kelas', [KelasController::class, 'index'])->name('kelas.index');
    Route::post('kelas', [KelasController::class, 'store'])->name('kelas.store');
    Route::put('kelas/{kela}', [KelasController::class, 'update'])->name('kelas.update');
    Route::delete('kelas/{kela}', [KelasController::class, 'destroy'])->name('kelas.destroy');

    Route::get('ubah-sandi', [PasswordResetController::class, 'showChange'])->name('password.change.show');
    Route::post('ubah-sandi', [PasswordResetController::class, 'updateChange'])->name('password.change');

    Route::get('export/download', [ExportPageController::class, 'export'])->name('export.download');
    Route::get('export-absensi', [AttendanceExportController::class, 'export'])->name('export-absensi');

    // CSV Import: template & import untuk 10 platform
    Route::get('import/template/{entity}', [ImportController::class, 'template'])->name('import.template');
    Route::post('import/{entity}', [ImportController::class, 'import'])->name('import');
    Route::get('import/template/{entity}/info', function (string $entity) {
        $map = [
            'tahun-ajaran' => ['headers' => ['tahun_awal', 'tahun_akhir']],
            'kelas' => ['headers' => ['nama_kelas']],
            'guru' => ['headers' => ['nip', 'nama', 'jenis_kelamin', 'kelas']],
            'siswa' => ['headers' => ['nisn', 'nama', 'jenis_kelamin', 'kelas']],
            'admin' => ['headers' => ['name', 'email', 'password']],
        ];

        return response()->json($map[$entity] ?? ['headers' => []]);
    })->name('import.info');
});
