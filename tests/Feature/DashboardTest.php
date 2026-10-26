<?php

use App\Models\User;

test('guests are redirected to the welcome page', function () {
    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('home'));
});

test('admin is redirected to the admin dashboard', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $this->actingAs($user)->get(route('dashboard'))
        ->assertRedirect(route('admin.dashboard', absolute: false));
});

test('guru is redirected to the guru presensi page', function () {
    $user = User::factory()->create(['role' => 'guru']);

    $this->actingAs($user)->get(route('dashboard'))
        ->assertRedirect(route('guru.absensi.index', absolute: false));
});

test('siswa is redirected to the siswa dashboard', function () {
    $user = User::factory()->create(['role' => 'siswa']);

    $this->actingAs($user)->get(route('dashboard'))
        ->assertRedirect(route('siswa.dashboard', absolute: false));
});
