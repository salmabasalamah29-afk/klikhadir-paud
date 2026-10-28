<?php

use App\Models\Guru;
use App\Models\GuruPresensi;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->guruUser = User::factory()->create(['role' => 'guru', 'password_default' => false]);
    Guru::create([
        'user_id' => $this->guruUser->id,
        'nama' => 'Guru Presensi Diri',
    ]);

    $this->today = now()->toDateString();
    $this->yesterday = now()->subDay()->toDateString();
});

test('guru hanya melihat presensi diri miliknya beserta data hari ini', function () {
    GuruPresensi::create([
        'user_id' => $this->guruUser->id,
        'tanggal' => $this->yesterday,
        'status' => 'sakit',
        'keterangan' => 'Demam',
    ]);

    GuruPresensi::create([
        'user_id' => $this->guruUser->id,
        'tanggal' => $this->today,
        'status' => 'hadir',
    ]);

    $guruLain = User::factory()->create(['role' => 'guru', 'password_default' => false]);
    GuruPresensi::create([
        'user_id' => $guruLain->id,
        'tanggal' => $this->today,
        'status' => 'izin',
    ]);

    $this->actingAs($this->guruUser)
        ->get(route('guru.presensi-diri.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('guru/presensi-diri/index')
            ->has('guruPresensis', 2)
            ->where('guruPresensis.0.tanggal', $this->today)
            ->where('guruPresensis.0.status', 'hadir')
            ->where('guruPresensis.1.tanggal', $this->yesterday)
            ->where('guruPresensis.1.status', 'sakit')
            ->where('guruPresensis.1.keterangan', 'Demam')
            ->where('todayPresensi.tanggal', $this->today)
            ->where('todayPresensi.status', 'hadir')
            ->where('today', $this->today));
});

test('guru dapat menyimpan presensi diri untuk tanggal yang dipilih', function () {
    $this->actingAs($this->guruUser)
        ->post(route('guru.presensi-diri.store'), [
            'tanggal' => $this->yesterday,
            'status' => 'izin',
            'keterangan' => 'Urusan keluarga',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('guru_presensis', [
        'user_id' => $this->guruUser->id,
        'tanggal' => $this->yesterday,
        'status' => 'izin',
        'keterangan' => 'Urusan keluarga',
    ]);

    $this->actingAs($this->guruUser)
        ->post(route('guru.presensi-diri.store'), [
            'tanggal' => $this->yesterday,
            'status' => 'hadir',
        ])
        ->assertRedirect();

    expect(GuruPresensi::where('user_id', $this->guruUser->id)
        ->where('tanggal', $this->yesterday)
        ->count())->toBe(1);

    $this->assertDatabaseHas('guru_presensis', [
        'user_id' => $this->guruUser->id,
        'tanggal' => $this->yesterday,
        'status' => 'hadir',
    ]);
});

test('status presensi diri hanya menerima hadir sakit atau izin', function () {
    $this->actingAs($this->guruUser)
        ->from(route('guru.presensi-diri.index'))
        ->post(route('guru.presensi-diri.store'), [
            'tanggal' => $this->today,
            'status' => 'alpha',
        ])
        ->assertRedirect(route('guru.presensi-diri.index'))
        ->assertSessionHasErrors('status');

    expect(GuruPresensi::count())->toBe(0);
});

test('guru tidak dapat menghapus presensi diri milik guru lain', function () {
    $guruLain = User::factory()->create(['role' => 'guru', 'password_default' => false]);
    $presensi = GuruPresensi::create([
        'user_id' => $guruLain->id,
        'tanggal' => $this->today,
        'status' => 'hadir',
    ]);

    $this->actingAs($this->guruUser)
        ->delete(route('guru.presensi-diri.destroy', $presensi))
        ->assertRedirect()
        ->assertSessionHas('error');

    $this->assertDatabaseHas('guru_presensis', ['id' => $presensi->id]);
});
