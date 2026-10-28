<?php

use App\Models\Absensi;
use App\Models\ArsipPresensi;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use App\Models\User;

beforeEach(function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $this->tahunAktif = TahunAjaran::create(['tahun_awal' => '2025', 'tahun_akhir' => '2026', 'is_active' => true]);
    $this->kelasA = Kelas::create(['nama_kelas' => 'Kelompok A']);
});

function buatSiswaNaikKelas(int $kelasId, string $nisn, bool $isAlumni = false): Siswa
{
    return Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => $nisn])->id,
        'kelas_id' => $kelasId,
        'nisn' => $nisn,
        'nama' => 'Siswa '.$nisn,
        'is_alumni' => $isAlumni,
    ]);
}

function buatGuruNaikKelas(): Guru
{
    return Guru::create([
        'user_id' => User::factory()->create(['role' => 'guru'])->id,
        'nama' => 'Guru Presensi',
    ]);
}

test('naik kelas menandai seluruh siswa aktif sebagai alumni dan mengarsipkan presensi', function () {
    $aktif1 = buatSiswaNaikKelas($this->kelasA->id, '25.090001');
    $aktif2 = buatSiswaNaikKelas($this->kelasA->id, '25.090002');
    $alumniLama = buatSiswaNaikKelas($this->kelasA->id, '24.090001', true);
    $guru = buatGuruNaikKelas();

    Absensi::create(['siswa_id' => $aktif1->id, 'guru_id' => $guru->id, 'tanggal' => '2026-01-05', 'status' => 'hadir']);
    Absensi::create(['siswa_id' => $aktif2->id, 'guru_id' => $guru->id, 'tanggal' => '2026-01-05', 'status' => 'sakit', 'keterangan' => 'Demam']);

    $response = $this->post(route('admin.tahun-ajaran.naik-kelas'));

    $response->assertRedirect();
    $response->assertSessionHas('success', fn ($pesan) => str_contains($pesan, '2 siswa ditandai alumni'));

    // Seluruh siswa aktif menjadi alumni, alumni lama tetap alumni
    expect($aktif1->fresh()->is_alumni)->toBeTrue()
        ->and($aktif2->fresh()->is_alumni)->toBeTrue()
        ->and($alumniLama->fresh()->is_alumni)->toBeTrue();

    // Presensi diarsipkan dengan snapshot data siswa
    expect(ArsipPresensi::count())->toBe(2)
        ->and(ArsipPresensi::where('tahun_ajaran_id', $this->tahunAktif->id)->count())->toBe(2)
        ->and(ArsipPresensi::where('is_alumni', true)->count())->toBe(2)
        ->and(ArsipPresensi::where('siswa_nisn', '25.090001')->where('status', 'hadir')->exists())->toBeTrue()
        ->and(ArsipPresensi::where('siswa_nisn', '25.090002')->where('status', 'sakit')->where('keterangan', 'Demam')->exists())->toBeTrue();

    // Data presensi harian dibersihkan
    expect(Absensi::count())->toBe(0);
});

test('naik kelas menggulirkan tahun ajaran aktif ke tahun berikutnya', function () {
    buatSiswaNaikKelas($this->kelasA->id, '25.090001');

    $response = $this->post(route('admin.tahun-ajaran.naik-kelas'));

    $response->assertRedirect();
    $response->assertSessionHas('success', fn ($pesan) => str_contains($pesan, 'Aktif: 2026/2027'));

    expect($this->tahunAktif->fresh()->is_active)->toBeFalse()
        ->and(TahunAjaran::where('tahun_awal', '2026')->where('tahun_akhir', '2027')->where('is_active', true)->count())->toBe(1)
        ->and(TahunAjaran::where('is_active', true)->count())->toBe(1);
});

test('naik kelas tetap berjalan tanpa tahun ajaran aktif', function () {
    TahunAjaran::where('is_active', true)->update(['is_active' => false]);
    $tahunLama = TahunAjaran::create(['tahun_awal' => '2024', 'tahun_akhir' => '2025', 'is_active' => false]);

    $this->post(route('admin.tahun-ajaran.naik-kelas'))->assertRedirect();

    // Tahun berikutnya dari tahun terakhir yang ada dibuat dan diaktifkan
    expect(TahunAjaran::where('is_active', true)->count())->toBe(1)
        ->and(TahunAjaran::where('is_active', true)->first()->tahun_awal)->toBe('2025')
        ->and($tahunLama->fresh()->is_active)->toBeFalse();
});
