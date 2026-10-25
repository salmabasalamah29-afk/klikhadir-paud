<?php

use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($this->admin);

    $this->kelas = Kelas::create(['nama_kelas' => 'Kelompok A']);
});

test('guest is redirected to login on siswa index', function () {
    auth()->logout();

    $this->get(route('admin.siswa.index'))->assertRedirect(route('login'));
});

test('admin can view siswa list', function () {
    Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => '24.012505'])->id,
        'kelas_id' => $this->kelas->id,
        'nis' => '24.012505',
        'nama' => 'Velove Azalia Putri',
    ]);

    $this->get(route('admin.siswa.index'))->assertOk();
});

test('admin can search siswa by nisn', function () {
    Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => '24.012505'])->id,
        'kelas_id' => $this->kelas->id,
        'nis' => '24.012505',
        'nisn' => '0012345678',
        'nama' => 'Velove Azalia Putri',
    ]);

    Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => '24.012506'])->id,
        'kelas_id' => $this->kelas->id,
        'nis' => '24.012506',
        'nisn' => '0099999999',
        'nama' => 'Siswa Lain',
    ]);

    $this->get(route('admin.siswa.index', ['search' => '0012345678']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/siswa/index')
            ->has('siswas.data', 1)
            ->where('siswas.data.0.nisn', '0012345678'));
});

test('admin can create siswa with NISN', function () {
    $response = $this->post(route('admin.siswa.store'), [
        'nisn' => '0012345678',
        'nama' => 'Velove Azalia Putri',
        'jenis_kelamin' => 'perempuan',
        'kelas_id' => $this->kelas->id,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('siswas', [
        'nis' => '0012345678',
        'nisn' => '0012345678',
        'nama' => 'Velove Azalia Putri',
        'jenis_kelamin' => 'perempuan',
    ]);

    $this->assertDatabaseHas('users', [
        'username' => '0012345678',
        'name' => 'Velove Azalia Putri',
    ]);
});

test('admin cannot create siswa without NISN', function () {
    $response = $this->post(route('admin.siswa.store'), [
        'nama' => 'Velove Azalia Putri',
        'kelas_id' => $this->kelas->id,
    ]);

    $response->assertSessionHasErrors(['nisn']);
});

test('admin can update siswa with NISN', function () {
    $siswa = Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => '24.012505'])->id,
        'kelas_id' => $this->kelas->id,
        'nis' => '24.012505',
        'nama' => 'Velove Azalia Putri',
    ]);

    $response = $this->put(route('admin.siswa.update', $siswa->id), [
        'nisn' => '0012345678',
        'nama' => 'Velove Azalia Putri',
        'jenis_kelamin' => 'perempuan',
        'kelas_id' => $this->kelas->id,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('siswas', [
        'id' => $siswa->id,
        'nis' => '0012345678',
        'nisn' => '0012345678',
        'jenis_kelamin' => 'perempuan',
    ]);

    $this->assertDatabaseHas('users', [
        'id' => $siswa->user_id,
        'username' => '0012345678',
    ]);
});

test('admin can create siswa with an uploaded foto', function () {
    Storage::fake('public');

    $response = $this->post(route('admin.siswa.store'), [
        'nisn' => '0012345678',
        'nama' => 'Velove Azalia Putri',
        'jenis_kelamin' => 'perempuan',
        'kelas_id' => $this->kelas->id,
        'foto' => UploadedFile::fake()->image('foto.jpg')->size(500),
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('siswas', ['nisn' => '0012345678']);

    $siswa = Siswa::where('nisn', '0012345678')->first();
    $this->assertDatabaseHas('fotos', ['fotoable_id' => $siswa->id]);

    Storage::disk('public')->assertExists($siswa->foto->file_path);
    expect($siswa->foto_url)->toBeString()->toStartWith('/storage/fotos/');
});

test('uploaded foto is cropped to a 4x4 (square) ratio', function () {
    Storage::fake('public');

    $this->post(route('admin.siswa.store'), [
        'nisn' => '0012345678',
        'nama' => 'Velove Azalia Putri',
        'kelas_id' => $this->kelas->id,
        'foto' => UploadedFile::fake()->image('foto.jpg', 200, 120)->size(300),
    ])->assertRedirect();

    $siswa = Siswa::where('nisn', '0012345678')->first();
    $fotoPath = $siswa->foto->file_path;

    Storage::disk('public')->assertExists($fotoPath);

    $info = getimagesizefromstring(Storage::disk('public')->get($fotoPath));
    expect($info[0])->toBe(480);
    expect($info[1])->toBe(480);
});

test('admin can update siswa with existing foto sent as URL string', function () {
    Storage::fake('public');

    $siswa = Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => '24.012505'])->id,
        'kelas_id' => $this->kelas->id,
        'nis' => '24.012505',
        'nama' => 'Velove Azalia Putri',
    ]);

    $foto = UploadedFile::fake()->image('profil.jpg')->store('fotos', 'public');

    $siswa->foto()->create([
        'file_path' => $foto,
        'original_name' => 'profil.jpg',
        'mime_type' => 'image/jpeg',
        'file_size' => 1024,
    ]);

    $response = $this->put(route('admin.siswa.update', $siswa->id), [
        'nisn' => '0012345678',
        'nama' => 'Velove Azalia Putri',
        'jenis_kelamin' => 'perempuan',
        'kelas_id' => $this->kelas->id,
        'foto' => Storage::disk('public')->url($foto),
        'remove_foto' => false,
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('siswas', ['id' => $siswa->id]);
    $this->assertDatabaseHas('fotos', [
        'fotoable_id' => $siswa->id,
        'file_path' => $foto,
    ]);
});

test('admin can view siswa profile', function () {
    $siswa = Siswa::create([
        'user_id' => User::factory()->create(['role' => 'siswa', 'username' => '24.012505'])->id,
        'kelas_id' => $this->kelas->id,
        'nis' => '24.012505',
        'nama' => 'Velove Azalia Putri',
    ]);

    $this->get(route('admin.siswa.profil', $siswa->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/siswa/profil')
            ->where('siswa.nis', '24.012505')
            ->has('siswa.foto_url'));
});
