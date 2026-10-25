<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Absensi;
use App\Models\Kelas;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StatistikController extends Controller
{
    public function index(Request $request, string $status)
    {
        $allowed = ['hadir', 'sakit', 'izin', 'kelas'];
        if (! in_array($status, $allowed, true)) {
            abort(404);
        }

        $tanggal = $request->query('tanggal', Carbon::today()->format('Y-m-d'));

        // validasi tanggal
        try {
            Carbon::parse($tanggal);
        } catch (\Exception $e) {
            $tanggal = Carbon::today()->format('Y-m-d');
        }

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
        if ($isOutOfYear) {
            return Inertia::render('admin/statistik/index', [
                'tanggal' => $tanggal,
                'status' => $status,
                'records' => [],
                'total' => 0,
                'kelasSudahAbsen' => 0,
                'isKelas' => $status === 'kelas',
                'activeYear' => $activeYear,
                'isOutOfYear' => true,
            ]);
        }

        if ($status === 'kelas') {
            return $this->kelasDetail($tanggal, $activeYear, $isOutOfYear);
        }

        return $this->statusDetail($tanggal, $status, $activeYear, $isOutOfYear);
    }

    private function statusDetail(string $tanggal, string $status, ?array $activeYear = null, bool $isOutOfYear = false)
    {
        // Ambil data paling terbaru per siswa, status berhalangan mengalahkan hadir
        $rawAll = Absensi::with(['siswa.kelas', 'siswa.foto', 'guru'])
            ->where('tanggal', $tanggal)
            ->orderBy('updated_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();
        $allLatest = $rawAll->groupBy('siswa_id')->map(function ($group) {
            $sorted = $group->sort(function ($a, $b) {
                $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                if ($ta === $tb) {
                    return $b->id <=> $a->id;
                }

                return $tb <=> $ta;
            })->values();
            $berhalangan = $sorted->first(function ($it) {
                return in_array($it->status, ['sakit', 'izin'], true);
            });

            $primary = $berhalangan ?? $sorted->first();

            return $primary;
        })->filter()->values();

        $absensis = $allLatest
            ->where('status', $status)
            ->values()
            ->map(function ($absensi) {
                $siswa = $absensi->siswa;
                $kelas = $siswa?->kelas;

                return [
                    'id' => $absensi->id,
                    'tanggal' => $absensi->tanggal,
                    'status' => $absensi->status,
                    'keterangan' => $absensi->keterangan,
                    'updated_at' => $absensi->updated_at?->timezone('Asia/Jakarta')->format('Y-m-d H:i:s'),
                    'siswa' => $siswa ? [
                        'id' => $siswa->id,
                        'nisn' => $siswa->nisn,
                        'nama' => $siswa->nama,
                        'foto_url' => $siswa->foto_url,
                    ] : null,
                    'kelas' => $kelas ? [
                        'id' => $kelas->id,
                        'nama_kelas' => $kelas->nama_kelas,
                        'full_nama_kelas' => $kelas->full_nama_kelas,
                    ] : null,
                    'guru' => $absensi->guru ? [
                        'id' => $absensi->guru->id,
                        'nama' => $absensi->guru->nama,
                    ] : null,
                ];
            });

        // Hitung total untuk info
        $total = $absensis->count();

        // Juga hitung kelas sudah absen untuk header
        $kelasSudahAbsen = DB::table('absensis')
            ->join('siswas', 'absensis.siswa_id', '=', 'siswas.id')
            ->where('absensis.tanggal', $tanggal)
            ->distinct()
            ->count(DB::raw('siswas.kelas_id'));

        return Inertia::render('admin/statistik/index', [
            'tanggal' => $tanggal,
            'status' => $status,
            'records' => $absensis,
            'total' => $total,
            'kelasSudahAbsen' => $kelasSudahAbsen,
            'isKelas' => false,
            'activeYear' => $activeYear,
            'isOutOfYear' => $isOutOfYear,
        ]);
    }

    private function kelasDetail(string $tanggal, ?array $activeYear = null, bool $isOutOfYear = false)
    {
        // Ambil distinct kelas yang sudah diabsen di tanggal tersebut, dengan ringkasan per status
        $kelasIds = DB::table('absensis')
            ->join('siswas', 'absensis.siswa_id', '=', 'siswas.id')
            ->where('absensis.tanggal', $tanggal)
            ->distinct()
            ->pluck('siswas.kelas_id');

        $kelasList = Kelas::whereIn('id', $kelasIds)->orderBy('id')->get()->map(function ($kelas) use ($tanggal) {
            // Hitung berdasarkan data terbaru per siswa - samain kaya lihat absensi
            $rawInKelas = Absensi::where('tanggal', $tanggal)
                ->whereHas('siswa', fn ($q) => $q->where('kelas_id', $kelas->id))
                ->orderBy('updated_at', 'desc')
                ->orderBy('id', 'desc')
                ->get();
            $latestInKelas = $rawInKelas->groupBy('siswa_id')->map(function ($group) {
                $sorted = $group->sort(function ($a, $b) {
                    $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                    $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                    if ($ta === $tb) {
                        return $b->id <=> $a->id;
                    }

                    return $tb <=> $ta;
                })->values();
                $berhalangan = $sorted->first(function ($it) {
                    return in_array($it->status, ['sakit', 'izin'], true);
                });

                return $berhalangan ?? $sorted->first();
            })->filter()->values();

            $statsGrouped = $latestInKelas->groupBy('status')->map->count()->toArray();
            $stats = $statsGrouped;

            $totalSiswaDiabsen = $latestInKelas->count();

            return [
                'id' => $kelas->id,
                'nama_kelas' => $kelas->nama_kelas,
                'full_nama_kelas' => $kelas->full_nama_kelas,
                'stats' => [
                    'hadir' => $stats['hadir'] ?? 0,
                    'sakit' => $stats['sakit'] ?? 0,
                    'izin' => $stats['izin'] ?? 0,
                ],
                'total_diabsen' => $totalSiswaDiabsen,
            ];
        });

        // Untuk header, ambil juga records untuk view yang mirip siswa history tapi aggregated
        // Kita tetap kirim records kosong, frontend akan handle isKelas=true
        $kelasSudahAbsen = $kelasList->count();
        $totalKelas = Kelas::count();

        return Inertia::render('admin/statistik/index', [
            'tanggal' => $tanggal,
            'status' => 'kelas',
            'records' => $kelasList,
            'total' => $kelasSudahAbsen,
            'totalKelas' => $totalKelas,
            'kelasSudahAbsen' => $kelasSudahAbsen,
            'isKelas' => true,
            'activeYear' => $activeYear,
            'isOutOfYear' => $isOutOfYear,
        ]);
    }
}
