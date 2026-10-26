<?php

use App\Models\Absensi;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $this->kelas = Kelas::create(['nama_kelas' => 'Kelompok A']);

    $guruUser = User::factory()->create(['role' => 'guru', 'username' => 'guru-satu']);
    $this->guru = Guru::create([
        'user_id' => $guruUser->id,
        'nama' => 'Guru Satu',
    ]);

    $siswaUser = User::factory()->create(['role' => 'siswa', 'username' => 'siswa-satu']);
    $this->siswa = Siswa::create([
        'user_id' => $siswaUser->id,
        'kelas_id' => $this->kelas->id,
        'nis' => '25001',
        'nisn' => '0025001',
        'nama' => 'Siswa Satu',
        'is_alumni' => false,
    ]);

    $this->tanggal = now()->format('Y-m-d');
});

test('statistik status menampilkan data absensi dengan relasi PAUD', function () {
    Absensi::create([
        'siswa_id' => $this->siswa->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'sakit',
        'keterangan' => 'Demam',
    ]);

    $this->get(route('admin.statistik', ['status' => 'sakit', 'tanggal' => $this->tanggal]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/statistik/index')
            ->where('status', 'sakit')
            ->where('isKelas', false)
            ->where('total', 1)
            ->where('records.0.siswa.nama', 'Siswa Satu')
            ->where('records.0.siswa.nisn', '0025001')
            ->where('records.0.keterangan', 'Demam')
            ->where('records.0.kelas.nama_kelas', 'Kelompok A')
            ->where('records.0.guru.nama', 'Guru Satu')
            ->missing('records.0.siswa.nis')
            ->missing('records.0.mapel')
            ->missing('records.0.jam_ke')
            ->missing('records.0.bukti')
            ->missing('records.0.kelas.jurusan_singkatan')
        );
});

test('semua status statistik PAUD dapat dibuka', function (string $status) {
    Absensi::create([
        'siswa_id' => $this->siswa->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'hadir',
    ]);

    $this->get(route('admin.statistik', ['status' => $status, 'tanggal' => $this->tanggal]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/statistik/index')
            ->where('status', $status)
        );
})->with(['hadir', 'sakit', 'izin', 'kelas']);

test('statistik kelas hanya merangkum status PAUD', function () {
    Absensi::create([
        'siswa_id' => $this->siswa->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'hadir',
    ]);

    $this->get(route('admin.statistik', ['status' => 'kelas', 'tanggal' => $this->tanggal]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/statistik/index')
            ->where('isKelas', true)
            ->where('records.0.nama_kelas', 'Kelompok A')
            ->where('records.0.stats.hadir', 1)
            ->where('records.0.stats.sakit', 0)
            ->where('records.0.stats.izin', 0)
            ->missing('records.0.stats.alpha')
            ->missing('records.0.stats.dispensasi')
            ->missing('records.0.tingkat')
            ->missing('records.0.jurusan_singkatan')
        );
});

test('status alpha dan dispensasi tidak lagi tersedia', function (string $status) {
    $this->get(route('admin.statistik', ['status' => $status, 'tanggal' => $this->tanggal]))
        ->assertNotFound();
})->with(['alpha', 'dispensasi']);
