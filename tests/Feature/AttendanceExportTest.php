<?php

use App\Models\Absensi;
use App\Models\ArsipPresensi;
use App\Models\Guru;
use App\Models\GuruPresensi;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use App\Models\User;

beforeEach(function () {
    $this->tanggal = '2026-10-28';
    $this->tanggalLengkap = 'Rabu, 28 Oktober 2026';

    $this->tahunAjaran = TahunAjaran::create([
        'tahun_awal' => 2026,
        'tahun_akhir' => 2027,
        'is_active' => true,
    ]);

    $this->kelas = Kelas::create(['nama_kelas' => 'Kelompok A']);

    $this->guruUser = User::factory()->create([
        'role' => 'guru',
        'name' => 'Guru Ekspor',
        'password_default' => false,
    ]);

    $this->guru = Guru::create([
        'user_id' => $this->guruUser->id,
        'nama' => 'Guru Ekspor',
    ]);

    $siswaUser = User::factory()->create(['role' => 'siswa']);

    $this->siswa = Siswa::create([
        'user_id' => $siswaUser->id,
        'kelas_id' => $this->kelas->id,
        'nisn' => '0025001',
        'nama' => 'Siswa Ekspor',
        'is_alumni' => false,
    ]);

    Absensi::create([
        'siswa_id' => $this->siswa->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'izin',
        'keterangan' => 'Acara keluarga',
    ]);
});

test('ekspor presensi siswa guru memakai kolom dan tanggal standar', function () {
    $response = $this->actingAs($this->guruUser)->get(route('guru.export.download', [
        'type' => 'kelas',
        'kelas_ids' => [$this->kelas->id],
        'start_date' => $this->tanggal,
        'end_date' => $this->tanggal,
    ]));

    $response->assertOk()->assertDownload('rekap-presensi-siswa.xls');

    $content = $response->getContent();

    expect($content)
        ->toContain('Ekspor : Presensi Siswa')
        ->toContain('Periode : '.$this->tanggalLengkap)
        ->toContain('Kelas: Kelompok A')
        ->toContain('Tanggal: '.$this->tanggalLengkap)
        ->toContain('NO')
        ->toContain('NISN')
        ->toContain('NAMA SISWA')
        ->toContain('STATUS')
        ->toContain('KETERANGAN')
        ->toContain('Siswa Ekspor')
        ->not->toContain(' s/d ')
        ->not->toContain('Tidak ada data')
        ->not->toContain('BUKTI')
        ->not->toContain('Alpha')
        ->not->toContain('Dispensasi');
});

test('ekspor presensi guru memakai satu tabel tanpa kolom waktu presensi', function () {
    GuruPresensi::create([
        'user_id' => $this->guruUser->id,
        'tanggal' => $this->tanggal,
        'status' => 'hadir',
        'keterangan' => 'Datang tepat waktu',
    ]);

    $response = $this->actingAs($this->guruUser)->get(route('guru.export.download', [
        'type' => 'guru',
        'guru_ids' => [$this->guruUser->id],
        'start_date' => $this->tanggal,
        'end_date' => $this->tanggal,
    ]));

    $response->assertOk()->assertDownload('rekap-presensi-guru.xls');

    $content = $response->getContent();

    expect($content)
        ->toContain('Ekspor : Presensi Guru')
        ->toContain('Nama Guru : Guru Ekspor')
        ->toContain('Periode : '.$this->tanggalLengkap)
        ->toContain('NO')
        ->toContain('HARI &amp; TANGGAL')
        ->toContain($this->tanggalLengkap)
        ->toContain('STATUS')
        ->toContain('KETERANGAN')
        ->toContain('Datang tepat waktu')
        ->not->toContain('WAKTU PRESENSI')
        ->not->toContain('Aksi Hapus')
        ->not->toContain('Hapus');
});

test('admin memakai format ekspor presensi yang sama', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    GuruPresensi::create([
        'user_id' => $this->guruUser->id,
        'tanggal' => $this->tanggal,
        'status' => 'hadir',
    ]);

    $siswaResponse = $this->actingAs($admin)->get(route('admin.export.download', [
        'type' => 'kelas',
        'kelas_ids' => [$this->kelas->id],
        'start_date' => $this->tanggal,
        'end_date' => $this->tanggal,
    ]));

    $siswaResponse->assertOk()->assertDownload('rekap-presensi-siswa.xls');

    expect($siswaResponse->getContent())
        ->toContain('Ekspor : Presensi Siswa')
        ->toContain('Kelas: Kelompok A')
        ->toContain('Tanggal: '.$this->tanggalLengkap)
        ->toContain('NAMA SISWA')
        ->toContain($this->tanggalLengkap)
        ->not->toContain('BUKTI');

    $guruResponse = $this->actingAs($admin)->get(route('admin.export.download', [
        'type' => 'guru',
        'guru_ids' => [$this->guruUser->id],
        'start_date' => $this->tanggal,
        'end_date' => $this->tanggal,
    ]));

    $guruResponse->assertOk()->assertDownload('rekap-presensi-guru.xls');

    expect($guruResponse->getContent())
        ->toContain('Ekspor : Presensi Guru')
        ->toContain('Nama Guru : Guru Ekspor')
        ->toContain($this->tanggalLengkap)
        ->not->toContain('WAKTU PRESENSI')
        ->not->toContain('Aksi Hapus');
});

test('ekspor siswa memisahkan blok per kelas dan tanggal secara kronologis', function () {
    $kelasB = Kelas::create(['nama_kelas' => 'Kelompok B']);
    $siswaUserB = User::factory()->create(['role' => 'siswa']);
    $siswaB = Siswa::create([
        'user_id' => $siswaUserB->id,
        'kelas_id' => $kelasB->id,
        'nisn' => '0025002',
        'nama' => 'Siswa Kelas B',
        'is_alumni' => false,
    ]);

    Absensi::create([
        'siswa_id' => $this->siswa->id,
        'guru_id' => $this->guru->id,
        'tanggal' => '2026-10-27',
        'status' => 'hadir',
    ]);

    Absensi::create([
        'siswa_id' => $siswaB->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'hadir',
    ]);

    $response = $this->actingAs($this->guruUser)->get(route('guru.export.download', [
        'type' => 'kelas',
        'kelas_ids' => [$this->kelas->id, $kelasB->id],
        'start_date' => '2026-10-26',
        'end_date' => '2026-10-29',
    ]));

    $response->assertOk();

    $content = $response->getContent();
    $selasa = 'Tanggal: Selasa, 27 Oktober 2026';
    $rabu = 'Tanggal: '.$this->tanggalLengkap;

    expect($content)
        ->toContain('Periode : Senin, 26 Oktober 2026 s/d Kamis, 29 Oktober 2026')
        ->toContain('Kelas: Kelompok A')
        ->toContain('Kelas: Kelompok B')
        ->toContain($selasa)
        ->toContain($rabu)
        ->not->toContain('Tanggal: Senin, 26 Oktober 2026')
        ->not->toContain('Tanggal: Kamis, 29 Oktober 2026')
        ->not->toContain('Tidak ada data');

    expect(strpos($content, $selasa))->toBeLessThan(strpos($content, $rabu));
    expect(substr_count($content, $selasa))->toBe(1);
    expect(substr_count($content, $rabu))->toBe(2);
});

test('ekspor tetap berjalan saat hanya satu tanggal diisi', function () {
    $startOnly = $this->actingAs($this->guruUser)->get(route('guru.export.download', [
        'type' => 'kelas',
        'kelas_ids' => [$this->kelas->id],
        'start_date' => $this->tanggal,
    ]));

    $startOnly->assertOk()->assertDownload('rekap-presensi-siswa.xls');

    expect($startOnly->getContent())
        ->toContain('Periode : '.$this->tanggalLengkap)
        ->toContain('Tanggal: '.$this->tanggalLengkap)
        ->not->toContain(' s/d ');

    GuruPresensi::create([
        'user_id' => $this->guruUser->id,
        'tanggal' => $this->tanggal,
        'status' => 'hadir',
    ]);

    $endOnly = $this->actingAs($this->guruUser)->get(route('guru.export.download', [
        'type' => 'guru',
        'guru_ids' => [$this->guruUser->id],
        'end_date' => $this->tanggal,
    ]));

    $endOnly->assertOk()->assertDownload('rekap-presensi-guru.xls');

    expect($endOnly->getContent())
        ->toContain('Periode : '.$this->tanggalLengkap)
        ->toContain('Guru Ekspor')
        ->not->toContain(' s/d ');
});

test('ekspor rekap dari data absensi guru memakai kolom siswa standar', function () {
    $response = $this->actingAs($this->guruUser)->get(route('guru.export-absensi', [
        'kelas_ids' => [$this->kelas->id],
        'start_date' => $this->tanggal,
        'end_date' => $this->tanggal,
        'simple' => '1',
        'lihat_absensi' => '1',
    ]));

    $response->assertOk()->assertDownload('rekap-presensi-siswa.xls');

    $content = $response->getContent();

    expect($content)
        ->toContain('NAMA SISWA')
        ->toContain('HARI &amp; TANGGAL')
        ->toContain('STATUS')
        ->toContain('KETERANGAN')
        ->toContain($this->tanggalLengkap)
        ->not->toContain('BUKTI')
        ->not->toContain('Kelas</th>');
});

test('ekspor arsip admin memakai kolom dan tanggal standar', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    ArsipPresensi::create([
        'tahun_ajaran_id' => $this->tahunAjaran->id,
        'siswa_id' => $this->siswa->id,
        'kelas_id' => $this->kelas->id,
        'guru_id' => $this->guru->id,
        'tanggal' => $this->tanggal,
        'status' => 'izin',
        'keterangan' => 'Acara keluarga',
        'siswa_nisn' => $this->siswa->nisn,
        'siswa_nama' => $this->siswa->nama,
    ]);

    $response = $this->actingAs($admin)->get(route('admin.tahun-ajaran.arsip.export', [
        'tahunAjaran' => $this->tahunAjaran->id,
        'kelas' => $this->kelas->id,
    ]));

    $response->assertOk();

    $content = $response->getContent();

    expect($content)
        ->toContain('NO')
        ->toContain('NAMA SISWA')
        ->toContain('HARI &amp; TANGGAL')
        ->toContain($this->tanggalLengkap)
        ->toContain('Acara keluarga')
        ->not->toContain('BUKTI')
        ->not->toContain('Kelas</th>');
});
