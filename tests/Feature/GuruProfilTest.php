<?php

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guru can view his own profile page', function () {
    $user = User::factory()->create(['role' => 'guru', 'password_default' => false]);
    Guru::create([
        'user_id' => $user->id,
        'nama' => 'Ahmad Fauzi',
        'jenis_kelamin' => 'laki-laki',
    ]);

    $this->actingAs($user)
        ->get(route('guru.profil'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('guru/profil')
            ->where('profil.nama', 'Ahmad Fauzi')
            ->where('profil.jenis_kelamin', 'laki-laki')
            ->has('profil.foto_url'));
});

test('shared auth user of guru exposes profile data and avatar', function () {
    $user = User::factory()->create(['role' => 'guru', 'password_default' => false]);
    Guru::create([
        'user_id' => $user->id,
        'nama' => 'Ahmad Fauzi',
    ]);

    $this->actingAs($user)
        ->get(route('guru.profil'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.role', 'guru')
            ->where('auth.user.guru.nama', 'Ahmad Fauzi')
            ->has('auth.user.avatar'));
});

test('siswa role cannot access guru profile page', function () {
    $user = User::factory()->create(['role' => 'siswa', 'password_default' => false]);
    $kelas = Kelas::create([
        'nama_kelas' => 'Kelompok A',
    ]);
    Siswa::create([
        'user_id' => $user->id,
        'kelas_id' => $kelas->id,
        'nis' => '24.012505',
        'nama' => 'Velove Azalia Putri',
    ]);

    $this->actingAs($user)
        ->get(route('guru.profil'))
        ->assertForbidden();
});
