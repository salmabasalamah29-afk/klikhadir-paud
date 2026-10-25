<?php

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('template impor kelas berisi contoh TK A tanpa BOM', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $response = $this->get(route('admin.import.template', ['entity' => 'kelas']));

    $response->assertOk();

    $content = $response->streamedContent();

    expect($content)->not->toStartWith("\xEF\xBB\xBF");

    $lines = preg_split('/\r\n|\n|\r/', trim($content));

    expect($lines)->toHaveCount(2);
    expect(str_getcsv($lines[0]))->toBe(['nama_kelas']);
    expect(str_getcsv($lines[1]))->toBe(['TK A']);
});

test('template impor guru hanya berisi nama dan jenis kelamin tanpa BOM', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $response = $this->get(route('admin.import.template', ['entity' => 'guru']));

    $response->assertOk();

    $content = $response->streamedContent();

    expect($content)->not->toStartWith("\xEF\xBB\xBF");

    $lines = preg_split('/\r\n|\n|\r/', trim($content));

    expect($lines)->toHaveCount(2);
    expect(str_getcsv($lines[0]))->toBe(['nama', 'jenis_kelamin']);
    expect(str_getcsv($lines[1]))->toBe(['Hilmia Milandari', 'P']);
});

test('template impor siswa mengikuti urutan form tanpa nis', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $response = $this->get(route('admin.import.template', ['entity' => 'siswa']));

    $response->assertOk();

    $content = $response->streamedContent();

    expect($content)->not->toStartWith("\xEF\xBB\xBF");

    $lines = preg_split('/\r\n|\n|\r/', trim($content));

    $headers = [
        'nisn', 'nik', 'nama', 'nama_panggilan', 'jenis_kelamin', 'tempat_lahir',
        'tanggal_lahir', 'agama', 'tanggal_masuk', 'kelas', 'nama_ayah',
        'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp', 'anak_ke',
        'nama_jalan', 'desa', 'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos',
    ];

    expect($lines)->toHaveCount(2);
    expect(str_getcsv($lines[0]))->toBe($headers);
    expect(str_getcsv($lines[0]))->not->toContain('nis');
    expect(str_getcsv($lines[1]))->toHaveCount(count($headers));
});

test('admin can import siswa without nis column', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    Kelas::create(['nama_kelas' => 'KB A']);

    $headers = [
        'nisn', 'nik', 'nama', 'nama_panggilan', 'jenis_kelamin', 'tempat_lahir',
        'tanggal_lahir', 'agama', 'tanggal_masuk', 'kelas', 'nama_ayah',
        'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp', 'anak_ke',
        'nama_jalan', 'desa', 'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos',
    ];
    $row = [
        '240125010001', '1234567890123456', 'Andi Wijaya', 'Andi', 'L', 'Jakarta',
        '2020-01-15', 'Islam', '2024-07-01', 'KB A', 'Budi', 'PNS', 'Siti',
        'Ibu Rumah Tangga', '08123456789', '1', 'Jln. Merdeka', 'Desa Maju',
        'Kecamatan Tengah', 'Kabupaten Bogor', 'Jawa Barat', '16121',
    ];

    $file = UploadedFile::fake()->createWithContent(
        'siswa.csv',
        implode(',', $headers)."\n".implode(',', $row)."\n",
    );

    $this->post(route('admin.import', ['entity' => 'siswa']), ['file' => $file])
        ->assertRedirect();

    $siswa = Siswa::where('nisn', '240125010001')->firstOrFail();

    expect($siswa->nama)->toBe('Andi Wijaya');
    expect($siswa->nis)->toBe('240125010001');
    expect($siswa->jenis_kelamin)->toBe('laki-laki');
    expect($siswa->user->username)->toBe('240125010001');
    expect($siswa->kelas->nama_kelas)->toBe('KB A');
});

test('admin can import siswa with slash and excel serial dates', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    Kelas::create(['nama_kelas' => 'KB A']);

    $headers = [
        'nisn', 'nik', 'nama', 'nama_panggilan', 'jenis_kelamin', 'tempat_lahir',
        'tanggal_lahir', 'agama', 'tanggal_masuk', 'kelas', 'nama_ayah',
        'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp', 'anak_ke',
        'nama_jalan', 'desa', 'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos',
    ];
    $rows = [
        ['240125010002', '1234567890123457', 'Budi Santoso', 'Budi', 'L', 'Bandung', '1/15/2020', 'Islam', '43845', 'KB A', 'Ayah Budi', 'Karyawan', 'Ibu Budi', 'IRT', '08123456780', '2', 'Jln. Melati', 'Desa Baru', 'Kecamatan Timur', 'Kabupaten Bandung', 'Jawa Barat', '40211'],
        ['240125010003', '1234567890123458', 'Citra Dewi', 'Citra', 'P', 'Surabaya', '31/01/2021', 'Kristen', '2021-02-01', 'KB A', 'Ayah Citra', 'Guru', 'Ibu Citra', 'Wirausaha', '08123456781', '1', 'Jln. Mawar', 'Desa Lama', 'Kecamatan Barat', 'Kota Surabaya', 'Jawa Timur', '60111'],
    ];

    $content = implode(',', $headers)."\n";
    foreach ($rows as $row) {
        $content .= implode(',', $row)."\n";
    }

    $file = UploadedFile::fake()->createWithContent('siswa.csv', $content);

    $this->post(route('admin.import', ['entity' => 'siswa']), ['file' => $file])
        ->assertRedirect();

    $budi = Siswa::where('nisn', '240125010002')->firstOrFail();
    expect($budi->tanggal_lahir)->toBe('2020-01-15');
    expect($budi->tanggal_masuk)->toBe('2020-01-15');

    $citra = Siswa::where('nisn', '240125010003')->firstOrFail();
    expect($citra->tanggal_lahir)->toBe('2021-01-31');
    expect($citra->tanggal_masuk)->toBe('2021-02-01');
});

test('template impor admin memakai header nama tanpa BOM', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $response = $this->get(route('admin.import.template', ['entity' => 'admin']));

    $response->assertOk();

    $content = $response->streamedContent();

    expect($content)->not->toStartWith("\xEF\xBB\xBF");

    $lines = preg_split('/\r\n|\n|\r/', trim($content));

    expect($lines)->toHaveCount(2);
    expect(str_getcsv($lines[0]))->toBe(['nama', 'email', 'password']);
    expect(str_getcsv($lines[1]))->toBe(['Admin Kurikulum', 'admin@sekolah.com', 'password123']);
});

test('admin can import admin using nama header', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $file = UploadedFile::fake()->createWithContent(
        'admin.csv',
        "nama,email,password\nAdmin Baru,adminbaru@sekolah.com,password123\n",
    );

    $this->post(route('admin.import', ['entity' => 'admin']), ['file' => $file])
        ->assertRedirect();

    $imported = User::where('email', 'adminbaru@sekolah.com')->firstOrFail();

    expect($imported->name)->toBe('Admin Baru');
    expect($imported->role)->toBe('admin');
    expect($imported->password_default)->toBeFalse();
    expect(Hash::check('password123', $imported->password))->toBeTrue();
});

test('admin can import guru without nip', function () {
    $admin = User::factory()->create(['role' => 'admin', 'password_default' => false]);
    $this->actingAs($admin);

    $file = UploadedFile::fake()->createWithContent(
        'guru.csv',
        "nama,jenis_kelamin\nHilmia Milandari,P\n",
    );

    $this->post(route('admin.import', ['entity' => 'guru']), ['file' => $file])
        ->assertRedirect();

    $guru = Guru::where('nama', 'Hilmia Milandari')->firstOrFail();

    expect($guru->jenis_kelamin)->toBe('perempuan');
    expect($guru->user->username)->toBe('hilmiamilandari');
    expect(Schema::hasColumn('gurus', 'nip'))->toBeFalse();
});
