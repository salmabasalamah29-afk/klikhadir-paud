<?php

namespace Database\Seeders;

use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SiswaSeeder extends Seeder
{
    public function run(): void
    {
        $kelas = Kelas::whereIn('nama_kelas', ['TK A', 'TK B'])
            ->get()
            ->keyBy('nama_kelas');

        foreach ($this->siswas() as $data) {
            $user = User::updateOrCreate(
                ['username' => $data['nisn']],
                [
                    'name' => $data['nama'],
                    'email' => $data['email'],
                    'password' => Hash::make('password'),
                    'password_default' => true,
                    'role' => 'siswa',
                ]
            );

            $siswa = Siswa::updateOrCreate(
                ['nisn' => $data['nisn']],
                [
                    'user_id' => $user->id,
                    'kelas_id' => $kelas[$data['kelas']]->id,
                    'nik' => $data['nik'],
                    'nama' => $data['nama'],
                    'nama_panggilan' => $data['nama_panggilan'],
                    'jenis_kelamin' => $data['jenis_kelamin'],
                    'tempat_lahir' => $data['tempat_lahir'],
                    'tanggal_lahir' => $data['tanggal_lahir'],
                    'agama' => 'Islam',
                    'tanggal_masuk' => '2025-07-14',
                    'nama_ayah' => $data['nama_ayah'],
                    'pekerjaan_ayah' => $data['pekerjaan_ayah'],
                    'nama_ibu' => $data['nama_ibu'],
                    'pekerjaan_ibu' => $data['pekerjaan_ibu'],
                    'no_hp' => $data['no_hp'],
                    'anak_ke' => $data['anak_ke'],
                    'nama_jalan' => $data['nama_jalan'],
                    'desa' => $data['desa'],
                    'kecamatan' => $data['kecamatan'],
                    'kabupaten_kota' => $data['kabupaten_kota'],
                    'provinsi' => $data['provinsi'],
                    'kode_pos' => $data['kode_pos'],
                    'is_alumni' => false,
                ]
            );
        }
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function siswas(): array
    {
        return [
            [
                'nisn' => '2400010001',
                'nik' => '3171010101190001',
                'nama' => 'BAHAR SAFAR',
                'nama_panggilan' => 'Bahar',
                'jenis_kelamin' => 'laki-laki',
                'tempat_lahir' => 'Jakarta',
                'tanggal_lahir' => '2019-04-12',
                'nama_ayah' => 'Safarudin',
                'pekerjaan_ayah' => 'Karyawan Swasta',
                'nama_ibu' => 'Nur Aisyah',
                'pekerjaan_ibu' => 'Ibu Rumah Tangga',
                'no_hp' => '081234567801',
                'anak_ke' => '1',
                'nama_jalan' => 'Jalan Melati No. 12',
                'desa' => 'Menteng',
                'kecamatan' => 'Menteng',
                'kabupaten_kota' => 'Jakarta Pusat',
                'provinsi' => 'DKI Jakarta',
                'kode_pos' => '10310',
                'kelas' => 'TK B',
                'email' => 'bahar.safar@siswa.klikhadir.sch.id',
            ],
            [
                'nisn' => '2400010002',
                'nik' => '3171010101200002',
                'nama' => 'JIHAN HALANA',
                'nama_panggilan' => 'Jihan',
                'jenis_kelamin' => 'perempuan',
                'tempat_lahir' => 'Jakarta',
                'tanggal_lahir' => '2020-02-08',
                'nama_ayah' => 'Halim Perdana',
                'pekerjaan_ayah' => 'PNS',
                'nama_ibu' => 'Lestari Ningsih',
                'pekerjaan_ibu' => 'Guru',
                'no_hp' => '081234567802',
                'anak_ke' => '1',
                'nama_jalan' => 'Jalan Kenanga No. 5',
                'desa' => 'Menteng',
                'kecamatan' => 'Menteng',
                'kabupaten_kota' => 'Jakarta Pusat',
                'provinsi' => 'DKI Jakarta',
                'kode_pos' => '10310',
                'kelas' => 'TK B',
                'email' => 'jihan.halana@siswa.klikhadir.sch.id',
            ],
            [
                'nisn' => '2400010003',
                'nik' => '3171010101210003',
                'nama' => 'KEJORA AYODYA',
                'nama_panggilan' => 'Kejora',
                'jenis_kelamin' => 'perempuan',
                'tempat_lahir' => 'Bandung',
                'tanggal_lahir' => '2021-01-20',
                'nama_ayah' => 'Aditya Pratama',
                'pekerjaan_ayah' => 'Wiraswasta',
                'nama_ibu' => 'Ayu Lestari',
                'pekerjaan_ibu' => 'Karyawan Swasta',
                'no_hp' => '081234567803',
                'anak_ke' => '2',
                'nama_jalan' => 'Jalan Anggrek No. 8',
                'desa' => 'Cihapit',
                'kecamatan' => 'Bandung Wetan',
                'kabupaten_kota' => 'Kota Bandung',
                'provinsi' => 'Jawa Barat',
                'kode_pos' => '40114',
                'kelas' => 'TK A',
                'email' => 'kejora.ayodya@siswa.klikhadir.sch.id',
            ],
            [
                'nisn' => '2400010004',
                'nik' => '3171010101190004',
                'nama' => 'MALIOBORO HARTIGAN',
                'nama_panggilan' => 'Malio',
                'jenis_kelamin' => 'laki-laki',
                'tempat_lahir' => 'Yogyakarta',
                'tanggal_lahir' => '2019-11-02',
                'nama_ayah' => 'Hartono Wibowo',
                'pekerjaan_ayah' => 'PNS',
                'nama_ibu' => 'Siti Rahayu',
                'pekerjaan_ibu' => 'Ibu Rumah Tangga',
                'no_hp' => '081234567804',
                'anak_ke' => '1',
                'nama_jalan' => 'Jalan Malioboro No. 21',
                'desa' => 'Sosromenduran',
                'kecamatan' => 'Gedongtengen',
                'kabupaten_kota' => 'Kota Yogyakarta',
                'provinsi' => 'DI Yogyakarta',
                'kode_pos' => '55271',
                'kelas' => 'TK A',
                'email' => 'malioboro.hartigan@siswa.klikhadir.sch.id',
            ],
            [
                'nisn' => '2400010005',
                'nik' => '3171010101200005',
                'nama' => 'MARCELLO ESRE',
                'nama_panggilan' => 'Cello',
                'jenis_kelamin' => 'laki-laki',
                'tempat_lahir' => 'Surabaya',
                'tanggal_lahir' => '2020-06-17',
                'nama_ayah' => 'Roberto Esre',
                'pekerjaan_ayah' => 'Karyawan Swasta',
                'nama_ibu' => 'Maria Fransiska',
                'pekerjaan_ibu' => 'Perawat',
                'no_hp' => '081234567805',
                'anak_ke' => '1',
                'nama_jalan' => 'Jalan Rungkut Asri No. 14',
                'desa' => 'Rungkut',
                'kecamatan' => 'Rungkut',
                'kabupaten_kota' => 'Kota Surabaya',
                'provinsi' => 'Jawa Timur',
                'kode_pos' => '60293',
                'kelas' => 'TK B',
                'email' => 'marcello.esre@siswa.klikhadir.sch.id',
            ],
            [
                'nisn' => '2400010006',
                'nik' => '3171010101210006',
                'nama' => 'SEPTIAN AIDAN NUGROHO',
                'nama_panggilan' => 'Septian',
                'jenis_kelamin' => 'laki-laki',
                'tempat_lahir' => 'Semarang',
                'tanggal_lahir' => '2021-03-25',
                'nama_ayah' => 'Nugroho Adi Saputra',
                'pekerjaan_ayah' => 'Wiraswasta',
                'nama_ibu' => 'Dwi Astuti',
                'pekerjaan_ibu' => 'Guru',
                'no_hp' => '081234567806',
                'anak_ke' => '2',
                'nama_jalan' => 'Jalan Pandanaran No. 9',
                'desa' => 'Mugassari',
                'kecamatan' => 'Semarang Tengah',
                'kabupaten_kota' => 'Kota Semarang',
                'provinsi' => 'Jawa Tengah',
                'kode_pos' => '50249',
                'kelas' => 'TK A',
                'email' => 'septian.aidan.nugroho@siswa.klikhadir.sch.id',
            ],
        ];
    }
}
