<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportController extends Controller
{
    private const ENTITIES = [
        'tahun-ajaran',
        'kelas',
        'guru',
        'siswa',
        'admin',
    ];

    private const TEMPLATES = [
        'tahun-ajaran' => [
            'headers' => ['tahun_awal', 'tahun_akhir'],
            'examples' => [
                ['2024', '2025'],
            ],
            'description' => 'Tahun Ajaran: tahun_awal 4 digit, tahun_akhir 4 digit & > tahun_awal',
        ],
        'kelas' => [
            'headers' => ['nama_kelas'],
            'examples' => [
                ['TK A'],
            ],
            'description' => 'Kelas: nama_kelas opsional, kosongkan jika tidak ada.',
        ],
        'guru' => [
            'headers' => ['nama', 'jenis_kelamin'],
            'examples' => [
                ['Hilmia Milandari', 'P'],
            ],
            'description' => 'Guru: nama wajib diisi, jenis_kelamin L/P (L=laki-laki, P=perempuan).',
        ],
        'siswa' => [
            'headers' => ['nisn', 'nik', 'nama', 'nama_panggilan', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'agama', 'tanggal_masuk', 'kelas', 'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp', 'anak_ke', 'nama_jalan', 'desa', 'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos'],
            'examples' => [
                ['240125010001', '1234567890123456', 'Andi Wijaya', 'Andi', 'laki-laki', 'Jakarta', '2020-01-15', 'Islam', '2024-07-01', 'KB A', 'Budi', 'PNS', 'Siti', 'Ibu Rumah Tangga', '08123456789', '1', 'Jln. Merdeka', 'Desa Maju', 'Kecamatan Tengah', 'Kabupaten Bogor', 'Jawa Barat', '16121'],
            ],
            'description' => 'Siswa: NISN wajib dan unik, data pribadi, orang tua, alamat, dan Kelas (nama kelas harus sudah ada).',
        ],
        'admin' => [
            'headers' => ['nama', 'email', 'password'],
            'examples' => [
                ['Admin Kurikulum', 'admin@sekolah.com', 'password123'],
            ],
            'description' => 'Admin: nama wajib diisi, email unik, password opsional min 8 (default password jika kosong)',
        ],
    ];

    public function template(string $entity): StreamedResponse
    {
        if (! in_array($entity, self::ENTITIES, true)) {
            abort(404);
        }

        $template = self::TEMPLATES[$entity];
        $filename = "template_{$entity}.csv";

        return response()->streamDownload(function () use ($template) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $template['headers']);
            foreach ($template['examples'] as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function import(Request $request, string $entity)
    {
        if (! in_array($entity, self::ENTITIES, true)) {
            abort(404);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ], [
            'file.required' => 'File CSV wajib diunggah.',
            'file.mimes' => 'File harus format CSV.',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        $rows = [];
        $header = null;
        $errors = [];
        $success = 0;

        if (($handle = fopen($path, 'r')) !== false) {
            $firstLine = fgets($handle);
            if ($firstLine !== false) {
                $firstLine = preg_replace('/^\xEF\xBB\xBF/', '', $firstLine);
                $delimiter = ',';
                if (strpos($firstLine, "\t") !== false) {
                    $delimiter = "\t";
                } elseif (substr_count($firstLine, ';') > substr_count($firstLine, ',')) {
                    $delimiter = ';';
                }
                $header = array_map('trim', str_getcsv($firstLine, $delimiter));
                $header = array_map(fn ($h) => strtolower(str_replace(' ', '_', trim($h))), $header);
            }

            $expected = self::TEMPLATES[$entity]['headers'];
            $expectedLower = array_map('strtolower', $expected);

            if ($header !== $expectedLower) {
                fclose($handle);

                return back()->with('error', 'Header CSV tidak sesuai. Harus: '.implode(', ', $expected).'. Gunakan Download Template. Baris header terbaca: '.implode(', ', $header ?? []));
            }

            $rowNum = 1;
            while (($data = fgetcsv($handle, 0, $delimiter ?? ',')) !== false) {
                $rowNum++;
                if (count($data) === 1 && trim($data[0]) === '') {
                    continue;
                }
                if (count($data) !== count($expected)) {
                    $errors[] = "Baris $rowNum: jumlah kolom tidak sesuai (harus ".count($expected).')';

                    continue;
                }
                $row = array_combine($expectedLower, array_map('trim', $data));
                $rows[] = ['row' => $row, 'num' => $rowNum];
            }
            fclose($handle);
        }

        if (empty($rows)) {
            return back()->with('error', 'File CSV kosong atau hanya header. Pastikan file berisi minimal satu baris data.');
        }

        DB::beginTransaction();
        try {
            foreach ($rows as $item) {
                $row = $item['row'];
                $num = $item['num'];
                try {
                    $result = match ($entity) {
                        'tahun-ajaran' => $this->importTahunAjaran($row),
                        'kelas' => $this->importKelas($row),
                        'guru' => $this->importGuru($row),
                        'siswa' => $this->importSiswa($row),
                        'admin' => $this->importAdmin($row),
                        default => throw new \Exception('Entity tidak dikenal'),
                    };
                    if ($result) {
                        $success++;
                    }
                } catch (ValidationException $e) {
                    $errors[] = "Baris $num: ".implode(', ', collect($e->errors())->flatten()->toArray());
                } catch (\Exception $e) {
                    $errors[] = "Baris $num: ".$e->getMessage();
                }
            }

            if (! empty($errors)) {
                DB::rollBack();
                $ringkas = 'Import dibatalkan: tidak ada data yang ditambahkan karena '.count($errors).' baris bermasalah. Perbaiki file CSV Anda terlebih dahulu sesuai petunjuk di bawah.';
                $detail = array_slice($errors, 0, 50);

                return back()->with('error', $ringkas)->with('import_errors', $detail);
            }

            DB::commit();

            return back()->with('success', "Import berhasil: $success data berhasil ditambahkan.");
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->with('error', 'Terjadi kesalahan sistem saat impor: '.$e->getMessage())->with('import_errors', ['Baris tidak diketahui: '.$e->getMessage()]);
        }
    }

    private function importTahunAjaran(array $row): bool
    {
        $validator = Validator::make($row, [
            'tahun_awal' => 'required|string|size:4',
            'tahun_akhir' => 'required|string|size:4',
        ], [
            'tahun_awal.required' => 'Tahun awal wajib diisi (contoh: 2024)',
            'tahun_awal.size' => 'Tahun awal harus 4 digit angka',
            'tahun_akhir.required' => 'Tahun akhir wajib diisi (contoh: 2025)',
            'tahun_akhir.size' => 'Tahun akhir harus 4 digit angka',
        ]);
        $validator->after(function ($v) use ($row) {
            if (isset($row['tahun_awal'], $row['tahun_akhir']) && $row['tahun_akhir'] <= $row['tahun_awal']) {
                $v->errors()->add('tahun_akhir', 'Tahun akhir harus lebih besar dari tahun awal');
            }
        });
        $validator->validate();

        TahunAjaran::firstOrCreate(
            ['tahun_awal' => $row['tahun_awal'], 'tahun_akhir' => $row['tahun_akhir']],
            ['tahun_awal' => $row['tahun_awal'], 'tahun_akhir' => $row['tahun_akhir']]
        );

        return true;
    }

    private function importKelas(array $row): bool
    {
        Validator::make($row, [
            'nama_kelas' => 'nullable|string|max:255',
        ], [
            'nama_kelas.max' => 'Nama kelas maksimal 255 karakter',
        ])->validate();

        $namaKelas = trim($row['nama_kelas'] ?? '');
        if ($namaKelas === '') {
            $namaKelas = null;
        }

        Kelas::firstOrCreate(
            [
                'nama_kelas' => $namaKelas,
            ]
        );

        return true;
    }

    private function importGuru(array $row): bool
    {
        $row['jenis_kelamin'] = $this->normalizeJenisKelamin($row['jenis_kelamin'] ?? null);

        Validator::make($row, [
            'nama' => 'required|string|max:255',
            'jenis_kelamin' => 'nullable|in:laki-laki,perempuan',
        ], [
            'nama.required' => 'Nama wajib diisi',
            'jenis_kelamin.in' => 'Jenis kelamin harus L atau P (L=laki-laki, P=perempuan)',
        ])->validate();

        $existing = Guru::whereRaw('LOWER(nama) = ?', [mb_strtolower(trim($row['nama']))])->first();

        if ($existing) {
            $existing->update([
                'nama' => $row['nama'],
                'jenis_kelamin' => $row['jenis_kelamin'] ?: $existing->jenis_kelamin,
            ]);
            $existing->user->update(['name' => $row['nama']]);
        } else {
            $user = User::create([
                'name' => $row['nama'],
                'username' => $this->generateUsername($row['nama']),
                'password' => Hash::make('password'),
                'password_default' => true,
                'role' => 'guru',
            ]);
            Guru::create([
                'user_id' => $user->id,
                'nama' => $row['nama'],
                'jenis_kelamin' => $row['jenis_kelamin'] ?: null,
            ]);
        }

        return true;
    }

    private function importSiswa(array $row): bool
    {
        $row['jenis_kelamin'] = $this->normalizeJenisKelamin($row['jenis_kelamin'] ?? null);
        $row['tanggal_lahir'] = $this->normalizeTanggal($row['tanggal_lahir'] ?? null);
        $row['tanggal_masuk'] = $this->normalizeTanggal($row['tanggal_masuk'] ?? null);

        Validator::make($row, [
            'nisn' => ['required', 'string', 'max:20', 'unique:siswas,nisn', 'unique:siswas,nis', 'unique:users,username'],
            'nik' => 'nullable|string|max:20',
            'nama' => 'required|string|max:255',
            'nama_panggilan' => 'nullable|string|max:100',
            'jenis_kelamin' => 'nullable|in:laki-laki,perempuan',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date_format:Y-m-d',
            'agama' => 'nullable|string|max:50',
            'tanggal_masuk' => 'nullable|date_format:Y-m-d',
            'nama_ayah' => 'nullable|string|max:100',
            'pekerjaan_ayah' => 'nullable|string|max:100',
            'nama_ibu' => 'nullable|string|max:100',
            'pekerjaan_ibu' => 'nullable|string|max:100',
            'no_hp' => 'nullable|string|max:20',
            'anak_ke' => 'nullable|string|max:10',
            'nama_jalan' => 'nullable|string|max:100',
            'desa' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kabupaten_kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'kode_pos' => 'nullable|string|max:10',
            'kelas' => 'required|string|max:255',
        ], [
            'nisn.required' => 'NISN wajib diisi',
            'nisn.unique' => 'NISN sudah digunakan',
            'nama.required' => 'Nama wajib diisi',
            'jenis_kelamin.in' => 'Jenis kelamin harus L atau P (L=laki-laki, P=perempuan)',
            'tanggal_lahir.date_format' => 'Tanggal lahir tidak valid. Gunakan format YYYY-MM-DD atau M/D/YYYY.',
            'tanggal_masuk.date_format' => 'Tanggal masuk tidak valid. Gunakan format YYYY-MM-DD atau M/D/YYYY.',
            'kelas.required' => 'Kelas wajib diisi (isi dengan nama kelas)',
        ])->validate();

        $kelas = Kelas::get()->first(fn ($k) => $k->full_nama_kelas === trim($row['kelas']));
        if (! $kelas) {
            $kelas = Kelas::where('nama_kelas', trim($row['kelas']))->first();
        }
        if (! $kelas) {
            throw new \Exception("Kelas '{$row['kelas']}' tidak ditemukan");
        }

        $user = User::create([
            'name' => $row['nama'],
            'username' => $row['nisn'],
            'password' => Hash::make('password'),
            'password_default' => true,
            'role' => 'siswa',
        ]);

        Siswa::create([
            'user_id' => $user->id,
            'kelas_id' => $kelas->id,
            'nis' => $row['nisn'],
            'nisn' => $row['nisn'],
            'nik' => $row['nik'] ?? null,
            'nama' => $row['nama'],
            'nama_panggilan' => $row['nama_panggilan'] ?? null,
            'jenis_kelamin' => $row['jenis_kelamin'] ?: null,
            'tempat_lahir' => $row['tempat_lahir'] ?? null,
            'tanggal_lahir' => $row['tanggal_lahir'] ?? null,
            'agama' => $row['agama'] ?? null,
            'tanggal_masuk' => $row['tanggal_masuk'] ?? null,
            'nama_ayah' => $row['nama_ayah'] ?? null,
            'pekerjaan_ayah' => $row['pekerjaan_ayah'] ?? null,
            'nama_ibu' => $row['nama_ibu'] ?? null,
            'pekerjaan_ibu' => $row['pekerjaan_ibu'] ?? null,
            'no_hp' => $row['no_hp'] ?? null,
            'anak_ke' => $row['anak_ke'] ?? null,
            'nama_jalan' => $row['nama_jalan'] ?? null,
            'desa' => $row['desa'] ?? null,
            'kecamatan' => $row['kecamatan'] ?? null,
            'kabupaten_kota' => $row['kabupaten_kota'] ?? null,
            'provinsi' => $row['provinsi'] ?? null,
            'kode_pos' => $row['kode_pos'] ?? null,
        ]);

        return true;
    }

    private function importAdmin(array $row): bool
    {
        Validator::make($row, [
            'nama' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'nullable|string|min:8',
        ], [
            'nama.required' => 'Nama admin wajib diisi',
            'nama.max' => 'Nama maksimal 255 karakter',
            'email.required' => 'Email wajib diisi',
            'email.email' => 'Format email tidak valid',
            'email.max' => 'Email maksimal 255 karakter',
            'email.unique' => 'Email sudah terdaftar',
            'password.min' => 'Password minimal 8 karakter',
        ])->validate();

        $password = $row['password'] ?: 'password';
        $username = strstr($row['email'], '@', true) ?: $row['email'];

        User::create([
            'name' => $row['nama'],
            'email' => $row['email'],
            'username' => $this->generateUsername($username),
            'password' => Hash::make($password),
            'role' => 'admin',
            'password_default' => empty($row['password']),
        ]);

        return true;
    }

    private function generateUsername(string $baseUsername): string
    {
        $baseUsername = strtolower(str_replace(' ', '', $baseUsername));
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername.$counter++;
        }

        return $username;
    }

    private function normalizeTanggal(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        if (preg_match('/^\d{8}$/', $value) === 1) {
            return $this->formatTanggal(
                (int) substr($value, 0, 4),
                (int) substr($value, 4, 2),
                (int) substr($value, 6, 2),
            ) ?? $value;
        }

        if (is_numeric($value)) {
            $serial = (float) $value;

            if ($serial <= 0) {
                return null;
            }

            if ($serial < 100000) {
                return Carbon::create(1899, 12, 30)->addDays((int) $serial)->toDateString();
            }

            return $value;
        }

        if (preg_match('/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:\s+.*)?$/', $value, $matches) === 1) {
            return $this->formatTanggal(
                (int) $matches[1],
                (int) $matches[2],
                (int) $matches[3],
            ) ?? $value;
        }

        if (preg_match('/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})(?:\s+.*)?$/', $value, $matches) === 1) {
            $first = (int) $matches[1];
            $second = (int) $matches[2];
            $year = (int) $matches[3];

            if ($year < 100) {
                $year += $year >= 70 ? 1900 : 2000;
            }

            if ($first > 12 && $second <= 12) {
                $day = $first;
                $month = $second;
            } else {
                $month = $first;
                $day = $second;
            }

            return $this->formatTanggal($year, $month, $day) ?? $value;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return $value;
        }
    }

    private function formatTanggal(int $year, int $month, int $day): ?string
    {
        if (! checkdate($month, $day, $year)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    private function normalizeJenisKelamin(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $v = trim($value);
        if ($v === '') {
            return null;
        }
        $low = strtolower($v);
        $low = str_replace(['_', ' '], '-', $low);
        if ($low === 'l' || $low === 'laki-laki' || $low === 'laki') {
            return 'laki-laki';
        }
        if ($low === 'p' || $low === 'perempuan') {
            return 'perempuan';
        }

        return $v;
    }
}
