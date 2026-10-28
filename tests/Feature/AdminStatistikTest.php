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

test('statistik kelas menampilkan rekap jumlah siswa per status', function () {
    $siswaHadir = Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => 'siswa-dua'])->id,
        'kelas_id' => $this->kelas->id,
        'nisn' => '0025002',
        'nama' => 'Siswa Dua',
        'is_alumni' => false,
    ]);

    $siswaSakit = Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => 'siswa-tiga'])->id,
        'kelas_id' => $this->kelas->id,
        'nisn' => '0025003',
        'nama' => 'Siswa Tiga',
        'is_alumni' => false,
    ]);

    Absensi::create([
        'siswa_id' => $this->siswa->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'izin',
        'keterangan' => 'Acara keluarga',
    ]);

    Absensi::create([
        'siswa_id' => $siswaHadir->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'hadir',
    ]);

    Absensi::create([
        'siswa_id' => $siswaSakit->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'sakit',
    ]);

    $this->get(route('admin.statistik', ['status' => 'kelas', 'tanggal' => $this->tanggal]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/statistik/index')
            ->where('isKelas', true)
            ->where('total', 1)
            ->where('records.0.nama_kelas', 'Kelompok A')
            ->where('records.0.full_nama_kelas', 'Kelompok A')
            ->where('records.0.total_siswa', 3)
            ->where('records.0.hadir', 1)
            ->where('records.0.sakit', 1)
            ->where('records.0.izin', 1)
            ->where('records.0.guru.nama', 'Guru Satu')
            ->has('records.0.updated_at')
            ->missing('records.0.siswa')
            ->missing('records.0.status')
        );
});

test('statistik detail status mengurutkan berdasarkan kelas lalu nama siswa', function (string $status) {
    $kelasB = Kelas::create(['nama_kelas' => 'TK B']);
    $kelasA = Kelas::create(['nama_kelas' => 'TK A']);

    $siswas = [
        ['kelas' => $kelasB, 'nama' => 'Zaki', 'nisn' => '0025010', 'username' => 'zaki'],
        ['kelas' => $kelasA, 'nama' => 'Budi', 'nisn' => '0025011', 'username' => 'budi'],
        ['kelas' => $kelasB, 'nama' => 'Citra', 'nisn' => '0025012', 'username' => 'citra'],
        ['kelas' => $kelasA, 'nama' => 'Ani', 'nisn' => '0025013', 'username' => 'ani'],
    ];

    foreach ($siswas as $data) {
        $siswa = Siswa::create([
            'user_id' => User::factory()->create(['role' => 'siswa', 'username' => $data['username']])->id,
            'kelas_id' => $data['kelas']->id,
            'nisn' => $data['nisn'],
            'nama' => $data['nama'],
            'is_alumni' => false,
        ]);

        Absensi::create([
            'siswa_id' => $siswa->id,
            'guru_id' => $this->guru->id,
            'tanggal' => $this->tanggal,
            'status' => $status,
        ]);
    }

    $this->get(route('admin.statistik', ['status' => $status, 'tanggal' => $this->tanggal]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/statistik/index')
            ->where('total', 4)
            ->where('records.0.siswa.nama', 'Ani')
            ->where('records.0.kelas.nama_kelas', 'TK A')
            ->where('records.1.siswa.nama', 'Budi')
            ->where('records.1.kelas.nama_kelas', 'TK A')
            ->where('records.2.siswa.nama', 'Citra')
            ->where('records.2.kelas.nama_kelas', 'TK B')
            ->where('records.3.siswa.nama', 'Zaki')
            ->where('records.3.kelas.nama_kelas', 'TK B')
        );
})->with(['hadir', 'sakit', 'izin']);

test('status alpha dan dispensasi tidak lagi tersedia', function (string $status) {
    $this->get(route('admin.statistik', ['status' => $status, 'tanggal' => $this->tanggal]))
        ->assertNotFound();
})->with(['alpha', 'dispensasi']);
