<?php

use App\Models\Guru;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($this->admin);
});

test('guest is redirected to login on guru index', function () {
    auth()->logout();

    $this->get(route('admin.guru.index'))->assertRedirect('/');
});

test('admin can view guru list', function () {
    Guru::create([
        'user_id' => User::factory()->create(['role' => 'guru'])->id,
        'nama' => 'Arika Prihastanti',
    ]);

    $this->get(route('admin.guru.index'))->assertOk();
});

test('admin can create guru with required data', function () {
    $response = $this->post(route('admin.guru.store'), [
        'nama' => 'Budi Santoso, S.Pd',
        'jenis_kelamin' => 'laki-laki',
    ]);

    $response->assertRedirect();

    $guru = Guru::where('nama', 'Budi Santoso, S.Pd')->firstOrFail();

    expect($guru->jenis_kelamin)->toBe('laki-laki');
    expect($guru->user->password_default)->toBeTrue();
    expect($guru->user->role)->toBe('guru');
});

test('admin cannot create guru without nama', function () {
    $response = $this->post(route('admin.guru.store'), [
        'jenis_kelamin' => 'laki-laki',
    ]);

    $response->assertSessionHasErrors(['nama']);
});

test('admin can update guru data', function () {
    $guru = Guru::create([
        'user_id' => User::factory()->create(['role' => 'guru'])->id,
        'nama' => 'Arika Prihastanti',
    ]);

    $response = $this->put(route('admin.guru.update', $guru->id), [
        'nama' => 'Arika Prihastanti Sutami, S.Pd',
        'jenis_kelamin' => 'perempuan',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('gurus', [
        'id' => $guru->id,
        'nama' => 'Arika Prihastanti Sutami, S.Pd',
        'jenis_kelamin' => 'perempuan',
    ]);
});

test('admin can view guru profile', function () {
    $guru = Guru::create([
        'user_id' => User::factory()->create(['role' => 'guru'])->id,
        'nama' => 'Arika Prihastanti',
        'jenis_kelamin' => 'perempuan',
    ]);

    $this->get(route('admin.guru.profil', $guru->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/guru/profil')
            ->where('guru.nama', 'Arika Prihastanti')
            ->where('guru.jenis_kelamin', 'perempuan')
            ->has('guru.foto_url'));
});

test('admin can create guru with an uploaded foto', function () {
    Storage::fake('public');

    $response = $this->post(route('admin.guru.store'), [
        'nama' => 'Budi Santoso, S.Pd',
        'jenis_kelamin' => 'laki-laki',
        'foto' => UploadedFile::fake()->image('foto.jpg')->size(500),
    ]);

    $response->assertRedirect();

    $guru = Guru::where('nama', 'Budi Santoso, S.Pd')->firstOrFail();

    $this->assertDatabaseHas('fotos', ['fotoable_id' => $guru->id]);

    Storage::disk('public')->assertExists($guru->foto->file_path);
    expect($guru->foto_url)->toBeString()->toStartWith('/storage/fotos/');
});

test('admin can update guru with existing foto sent as URL string', function () {
    Storage::fake('public');

    $guru = Guru::create([
        'user_id' => User::factory()->create(['role' => 'guru'])->id,
        'nama' => 'Arika Prihastanti',
    ]);

    $foto = UploadedFile::fake()->image('profil.jpg')->store('fotos', 'public');

    $guru->foto()->create([
        'file_path' => $foto,
        'original_name' => 'profil.jpg',
        'mime_type' => 'image/jpeg',
        'file_size' => 1024,
    ]);

    $response = $this->put(route('admin.guru.update', $guru->id), [
        'nama' => 'Arika Prihastanti Sutami, S.Pd',
        'jenis_kelamin' => 'perempuan',
        'foto' => Storage::disk('public')->url($foto),
        'remove_foto' => false,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('gurus', [
        'id' => $guru->id,
        'nama' => 'Arika Prihastanti Sutami, S.Pd',
    ]);

    $this->assertDatabaseHas('fotos', [
        'fotoable_id' => $guru->id,
        'file_path' => $foto,
    ]);
});

test('admin can delete guru and its foto is removed', function () {
    $guru = Guru::create([
        'user_id' => User::factory()->create(['role' => 'guru'])->id,
        'nama' => 'Arika Prihastanti',
    ]);

    $guru->foto()->create([
        'file_path' => 'fotos/test.jpg',
        'original_name' => 'test.jpg',
        'mime_type' => 'image/jpeg',
        'file_size' => 1024,
    ]);

    $this->delete(route('admin.guru.destroy', $guru->id))->assertRedirect();

    $this->assertDatabaseMissing('gurus', ['id' => $guru->id]);
    $this->assertDatabaseMissing('fotos', ['fotoable_id' => $guru->id]);
});
