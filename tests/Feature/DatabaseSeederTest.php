<?php

use App\Models\Foto;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Database\Seeders\GuruSeeder;
use Database\Seeders\KelasSeeder;
use Database\Seeders\SiswaSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

test('seeder kelas membuat TK A dan TK B', function () {
    $this->seed(KelasSeeder::class);

    expect(Kelas::orderBy('nama_kelas')->pluck('nama_kelas')->all())
        ->toBe(['TK A', 'TK B']);
});

test('seeder guru membuat akun dan profil Titut Astuti', function () {
    $this->seed([KelasSeeder::class, GuruSeeder::class]);

    $user = User::where('username', 'titutastuti')->first();

    expect($user)->not->toBeNull()
        ->and($user->name)->toBe('Titut Astuti')
        ->and($user->role)->toBe('guru')
        ->and(Hash::check('password', $user->password))->toBeTrue();

    $guru = Guru::where('user_id', $user->id)->first();

    expect($guru)->not->toBeNull()
        ->and($guru->nama)->toBe('Titut Astuti')
        ->and($guru->jenis_kelamin)->toBe('perempuan')
        ->and($guru->kelas()->count())->toBe(2)
        ->and($guru->foto()->exists())->toBeFalse();
});

test('seeder siswa mengisi enam siswa alfabetis dengan nisn unik dan relasi lengkap', function () {
    $this->seed([KelasSeeder::class, GuruSeeder::class, SiswaSeeder::class]);

    $siswas = Siswa::with(['user', 'kelas'])->orderBy('id')->get();

    expect($siswas)->toHaveCount(6)
        ->and($siswas->pluck('nama')->all())->toBe([
            'BAHAR SAFAR',
            'JIHAN HALANA',
            'KEJORA AYODYA',
            'MALIOBORO HARTIGAN',
            'MARCELLO ESRE',
            'SEPTIAN AIDAN NUGROHO',
        ])
        ->and($siswas->pluck('nisn')->unique())->toHaveCount(6)
        ->and($siswas->every(fn (Siswa $siswa): bool => strlen($siswa->nisn) === 10 && ctype_digit($siswa->nisn)))->toBeTrue()
        ->and($siswas->every(fn (Siswa $siswa): bool => $siswa->user !== null && $siswa->kelas !== null))->toBeTrue()
        ->and(Foto::count())->toBe(0);

    expect(Schema::hasColumn('siswas', 'nis'))->toBeFalse();

    $kelas = $siswas->pluck('kelas.nama_kelas', 'nama')->all();

    expect($kelas['BAHAR SAFAR'])->toBe('TK B')
        ->and($kelas['JIHAN HALANA'])->toBe('TK B')
        ->and($kelas['KEJORA AYODYA'])->toBe('TK A')
        ->and($kelas['MALIOBORO HARTIGAN'])->toBe('TK A')
        ->and($kelas['MARCELLO ESRE'])->toBe('TK B')
        ->and($kelas['SEPTIAN AIDAN NUGROHO'])->toBe('TK A');

    $user = $siswas->first()->user;

    expect($user->role)->toBe('siswa')
        ->and(Hash::check('password', $user->password))->toBeTrue();
});

test('seeder dapat dijalankan ulang tanpa duplikasi', function () {
    $this->seed([KelasSeeder::class, GuruSeeder::class, SiswaSeeder::class]);
    $this->seed([KelasSeeder::class, GuruSeeder::class, SiswaSeeder::class]);

    expect(Kelas::count())->toBe(2)
        ->and(Guru::count())->toBe(1)
        ->and(Siswa::count())->toBe(6)
        ->and(User::where('role', 'guru')->count())->toBe(1)
        ->and(User::where('role', 'siswa')->count())->toBe(6);
});
