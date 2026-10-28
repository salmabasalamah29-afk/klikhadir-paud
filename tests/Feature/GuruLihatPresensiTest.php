<?php

use App\Models\Absensi;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->guruUser = User::factory()->create(['role' => 'guru', 'password_default' => false]);
    $this->guru = Guru::create([
        'user_id' => $this->guruUser->id,
        'nama' => 'Titut Astuti',
    ]);

    $this->kelas = Kelas::create(['nama_kelas' => 'Kelompok A']);

    $this->siswa = Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa'])->id,
        'kelas_id' => $this->kelas->id,
        'nisn' => '0025001',
        'nama' => 'Siswa Satu',
        'is_alumni' => false,
    ]);

    $this->tanggal = now()->format('Y-m-d');
});

test('guru dapat melihat presensi siswa dengan data NISN dan status PAUD', function () {
    Absensi::create([
        'siswa_id' => $this->siswa->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'izin',
        'keterangan' => 'Acara keluarga',
    ]);

    $this->actingAs($this->guruUser)
        ->get(route('guru.lihat-presensi.index', [
            'kelas_id' => $this->kelas->id,
            'tanggal' => $this->tanggal,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('guru/lihat-presensi/index')
            ->where('filters.kelas_id', (string) $this->kelas->id)
            ->where('filters.tanggal', $this->tanggal)
            ->has('kelasList', 1)
            ->has('siswas', 1)
            ->where('siswas.0.nisn', '0025001')
            ->where('siswas.0.nama', 'Siswa Satu')
            ->where('siswas.0.absensi.status', 'izin')
            ->where('siswas.0.absensi.keterangan', 'Acara keluarga')
            ->where('siswas.0.absensi.guru_nama', 'Titut Astuti')
            ->missing('siswas.0.absensi.bukti')
            ->missing('siswas.0.nis'));
});

test('siswa yang belum memiliki presensi tetap tampil dengan status kosong', function () {
    $this->actingAs($this->guruUser)
        ->get(route('guru.lihat-presensi.index', [
            'kelas_id' => $this->kelas->id,
            'tanggal' => $this->tanggal,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('siswas', 1)
            ->where('siswas.0.absensi', null));
});

test('guru hanya melihat siswa aktif pada kelas yang dipilih', function () {
    $kelasLain = Kelas::create(['nama_kelas' => 'Kelompok B']);

    Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa'])->id,
        'kelas_id' => $kelasLain->id,
        'nisn' => '0025002',
        'nama' => 'Siswa Kelas Lain',
        'is_alumni' => false,
    ]);

    $this->actingAs($this->guruUser)
        ->get(route('guru.lihat-presensi.index', [
            'kelas_id' => $this->kelas->id,
            'tanggal' => $this->tanggal,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('siswas', 1)
            ->where('siswas.0.nisn', '0025001'));
});
