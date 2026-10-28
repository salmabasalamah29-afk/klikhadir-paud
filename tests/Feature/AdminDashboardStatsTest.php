<?php

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $this->kelasA = Kelas::create(['nama_kelas' => 'Kelompok A']);
    $this->kelasB = Kelas::create(['nama_kelas' => 'Kelompok B']);
});

function buatSiswaDiKelas(int $kelasId, string $nisn, string $nama, bool $isAlumni = false): Siswa
{
    return Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => $nisn])->id,
        'kelas_id' => $kelasId,
        'nisn' => $nisn,
        'nama' => $nama,
        'is_alumni' => $isAlumni,
    ]);
}

test('dashboard total siswa dan distribusi per kelas hanya menghitung siswa aktif', function () {
    buatSiswaDiKelas($this->kelasA->id, '25.013001', 'Siswa A Satu');
    buatSiswaDiKelas($this->kelasA->id, '25.013002', 'Siswa A Dua');
    buatSiswaDiKelas($this->kelasB->id, '25.013003', 'Siswa B Satu');
    buatSiswaDiKelas($this->kelasA->id, '25.013004', 'Siswa Alumni', true);

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('stats.total_siswa', 3)
            ->missing('attendanceToday.alpha')
            ->missing('attendanceToday.dispensasi')
            ->where('studentsPerKelas', function ($kelas) {
                $map = collect($kelas)->pluck('count', 'nama_kelas')->all();

                return ($map['Kelompok A'] ?? null) === 2 && ($map['Kelompok B'] ?? null) === 1;
            })
        );
});

test('dashboard total siswa bertambah saat tambah data dan berkurang saat hapus data', function () {
    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('stats.total_siswa', 0));

    $this->post(route('admin.siswa.store'), [
        'nisn' => '0012345678',
        'nama' => 'Siswa Baru',
        'kelas_id' => $this->kelasA->id,
    ])->assertRedirect();

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('stats.total_siswa', 1));

    $siswa = Siswa::where('nisn', '0012345678')->firstOrFail();

    $this->delete(route('admin.siswa.destroy', $siswa->id))->assertRedirect();

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('stats.total_siswa', 0));
});

test('dashboard menyediakan user id guru untuk kebutuhan ekspor', function () {
    $guruUser = User::factory()->create(['role' => 'guru', 'name' => 'Guru Ekspor']);
    $guru = Guru::create([
        'user_id' => $guruUser->id,
        'nama' => 'Guru Ekspor',
    ]);

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('gurus.0.id', $guru->id)
            ->where('gurus.0.user_id', $guruUser->id)
        );
});
