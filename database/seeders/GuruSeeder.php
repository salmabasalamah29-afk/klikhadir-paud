<?php

namespace Database\Seeders;

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class GuruSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['username' => 'titutastuti'],
            [
                'name' => 'Titut Astuti',
                'email' => 'titut.astuti@klikhadir.sch.id',
                'password' => Hash::make('password'),
                'password_default' => true,
                'role' => 'guru',
            ]
        );

        $guru = Guru::updateOrCreate(
            ['user_id' => $user->id],
            [
                'nama' => 'Titut Astuti',
                'jenis_kelamin' => 'perempuan',
            ]
        );

        $kelasIds = Kelas::whereIn('nama_kelas', ['TK A', 'TK B'])->pluck('id');

        $guru->kelas()->syncWithoutDetaching($kelasIds);
    }
}
