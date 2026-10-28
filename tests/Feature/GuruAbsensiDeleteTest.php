<?php

use App\Models\Absensi;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guru can reset an attendance record and status becomes empty', function () {
    $guruUser = User::factory()->create(['role' => 'guru', 'password_default' => false]);
    $guru = Guru::create([
        'user_id' => $guruUser->id,
        'nama' => 'Guru Satu',
    ]);

    $kelas = Kelas::create(['nama_kelas' => 'Kelompok A']);

    $siswa = Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa'])->id,
        'kelas_id' => $kelas->id,
        'nisn' => '0025001',
        'nama' => 'Siswa Satu',
        'is_alumni' => false,
    ]);

    $tanggal = now()->format('Y-m-d');

    $absensi = Absensi::create([
        'siswa_id' => $siswa->id,
        'guru_id' => $guru->id,
        'tanggal' => $tanggal,
        'status' => 'hadir',
    ]);

    $this->actingAs($guruUser)
        ->delete(route('guru.absensi.destroy', $absensi))
        ->assertRedirect();

    $this->assertSoftDeleted('absensis', ['id' => $absensi->id]);

    $this->actingAs($guruUser)
        ->get(route('guru.absensi.index', ['kelas_id' => $kelas->id, 'tanggal' => $tanggal]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('guru/absensi/index')
            ->has('siswas', 1)
            ->where('siswas.0.id', $siswa->id)
            ->where('siswas.0.absensi', null));
});
