<?php

namespace Database\Seeders;

use App\Models\Kelas;
use Illuminate\Database\Seeder;

class KelasSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['TK A', 'TK B'] as $namaKelas) {
            Kelas::firstOrCreate(['nama_kelas' => $namaKelas]);
        }
    }
}
