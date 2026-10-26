<?php

use App\Models\TahunAjaran;
use App\Models\User;

test('guest is redirected to login', function () {
    $response = $this->get(route('admin.tahun-ajaran.index'));

    $response->assertRedirect(route('home'));
});

test('admin can view tahun ajaran list', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.tahun-ajaran.index'));

    $response->assertOk();
});

test('admin can create tahun ajaran', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $response = $this->post(route('admin.tahun-ajaran.store'), [
        'tahun_awal' => '2026',
        'tahun_akhir' => '2027',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('tahun_ajarans', [
        'tahun_awal' => '2026',
        'tahun_akhir' => '2027',
        'is_active' => false,
    ]);
});

test('admin cannot create tahun ajaran with invalid years', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $response = $this->post(route('admin.tahun-ajaran.store'), [
        'tahun_awal' => '2026',
        'tahun_akhir' => '2025',
    ]);

    $response->assertSessionHasErrors(['tahun_akhir']);
});

test('admin can update tahun ajaran', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $tahunAjaran = TahunAjaran::create([
        'tahun_awal' => '2026',
        'tahun_akhir' => '2027',
    ]);

    $response = $this->put(route('admin.tahun-ajaran.update', $tahunAjaran->id), [
        'tahun_awal' => '2027',
        'tahun_akhir' => '2028',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('tahun_ajarans', [
        'id' => $tahunAjaran->id,
        'tahun_awal' => '2027',
        'tahun_akhir' => '2028',
    ]);
});

test('admin can activate tahun ajaran', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $tahunAjaran = TahunAjaran::create([
        'tahun_awal' => '2026',
        'tahun_akhir' => '2027',
    ]);

    $response = $this->post(route('admin.tahun-ajaran.activate', $tahunAjaran->id));

    $response->assertRedirect();

    $this->assertDatabaseHas('tahun_ajarans', [
        'id' => $tahunAjaran->id,
        'is_active' => true,
    ]);
});

test('activating a tahun ajaran deactivates others', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $first = TahunAjaran::create(['tahun_awal' => '2025', 'tahun_akhir' => '2026', 'is_active' => true]);
    $second = TahunAjaran::create(['tahun_awal' => '2026', 'tahun_akhir' => '2027']);

    $this->post(route('admin.tahun-ajaran.activate', $second->id));

    $this->assertDatabaseHas('tahun_ajarans', ['id' => $first->id, 'is_active' => false]);
    $this->assertDatabaseHas('tahun_ajarans', ['id' => $second->id, 'is_active' => true]);
});

test('admin cannot delete active tahun ajaran', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $tahunAjaran = TahunAjaran::create([
        'tahun_awal' => '2026',
        'tahun_akhir' => '2027',
        'is_active' => true,
    ]);

    $response = $this->delete(route('admin.tahun-ajaran.destroy', $tahunAjaran->id));

    $response->assertSessionHasErrors(['active']);

    $this->assertDatabaseHas('tahun_ajarans', ['id' => $tahunAjaran->id]);
});

test('admin can delete non-active tahun ajaran', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);

    $this->actingAs($admin);

    $tahunAjaran = TahunAjaran::create([
        'tahun_awal' => '2026',
        'tahun_akhir' => '2027',
    ]);

    $response = $this->delete(route('admin.tahun-ajaran.destroy', $tahunAjaran->id));

    $response->assertRedirect();

    $this->assertDatabaseMissing('tahun_ajarans', ['id' => $tahunAjaran->id]);
});
