<?php

namespace App\Http\Controllers\Guru;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LihatPresensiController extends Controller
{
    public function index(Request $request)
    {
        $kelas = Kelas::orderBy('nama_kelas', 'asc')->get();

        $selectedKelasId = $request->query('kelas_id');
        $tanggal = $request->query('tanggal', now()->toDateString());

        $active = TahunAjaran::where('is_active', true)->first();
        $activeYear = null;
        $isOutOfYear = false;
        if ($active) {
            try {
                $s = Carbon::create((int) $active->tahun_awal, 7, 1)->format('Y-m-d');
                $e = Carbon::create((int) $active->tahun_akhir, 6, 30)->format('Y-m-d');
                $activeYear = ['tahun_awal' => $active->tahun_awal, 'tahun_akhir' => $active->tahun_akhir, 'start' => $s, 'end' => $e];
                $isOutOfYear = ! TahunAjaran::isDateInActiveYear($tanggal);
            } catch (\Throwable $ex) {
            }
        }

        $siswas = [];

        if ($selectedKelasId) {
            $rawSiswas = Siswa::where('kelas_id', $selectedKelasId)
                ->where('is_alumni', false)
                ->with(['foto', 'absensis' => function ($query) use ($tanggal) {
                    $query->where('tanggal', $tanggal)
                        ->with('guru')
                        ->orderBy('updated_at', 'desc');
                }])
                ->orderBy('nis', 'asc')
                ->get();

            $siswas = $rawSiswas->map(function ($siswa) {
                $absensi = $siswa->absensis->first();

                return [
                    'id' => $siswa->id,
                    'nis' => $siswa->nis,
                    'nama' => $siswa->nama,
                    'foto_url' => $siswa->foto_url,
                    'absensi' => $absensi ? [
                        'id' => $absensi->id,
                        'status' => $absensi->status,
                        'keterangan' => $absensi->keterangan,
                        'guru_nama' => $absensi->guru?->nama ?? '-',
                        'created_at' => $absensi->created_at,
                    ] : null,
                ];
            })->values()->all();
        }

        return Inertia::render('guru/lihat-presensi/index', [
            'kelasList' => $kelas,
            'filters' => [
                'kelas_id' => $selectedKelasId,
                'tanggal' => $tanggal,
            ],
            'siswas' => $isOutOfYear ? [] : $siswas,
            'activeYear' => $activeYear,
            'isOutOfYear' => $isOutOfYear,
        ]);
    }
}
