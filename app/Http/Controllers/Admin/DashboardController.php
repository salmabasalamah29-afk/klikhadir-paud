<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Absensi;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $tanggal = $request->query('tanggal', Carbon::today()->format('Y-m-d'));
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

        // Attendance stats for the selected date - hitung berdasarkan data terbaru per siswa dengan merge surat seharian (berhalangan mengalahkan Hadir)
        // Jika tanggal di luar tahun aktif, kosongkan (sudah diarsip)
        if ($isOutOfYear) {
            $attendanceStats = ['hadir' => 0, 'sakit' => 0, 'izin' => 0, 'alpha' => 0, 'dispensasi' => 0];
            $kelasSudahAbsen = 0;
        } else {
            $rawForDate = Absensi::where('tanggal', $tanggal)
                ->orderBy('updated_at', 'desc')
                ->orderBy('id', 'desc')
                ->get();
            $latestForDate = $rawForDate->groupBy('siswa_id')->map(function ($group) {
                $sorted = $group->sort(function ($a, $b) {
                    $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                    $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                    if ($ta === $tb) {
                        return $b->id <=> $a->id;
                    }

                    return $tb <=> $ta;
                })->values();
                $berhalangan = $sorted->first(function ($it) {
                    return in_array($it->status, ['sakit', 'izin', 'dispensasi', 'alpha'], true);
                });

                return $berhalangan ?? $sorted->first();
            })->filter()->values();
            $grouped = $latestForDate->groupBy('status')->map->count()->toArray();
            $attendanceStats = [
                'hadir' => $grouped['hadir'] ?? 0,
                'sakit' => $grouped['sakit'] ?? 0,
                'izin' => $grouped['izin'] ?? 0,
                'alpha' => $grouped['alpha'] ?? 0,
                'dispensasi' => $grouped['dispensasi'] ?? 0,
            ];

            // Kelas sudah diabsen: distinct kelas_id yang memiliki absensi di tanggal tersebut
            $kelasSudahAbsen = DB::table('absensis')
                ->join('siswas', 'absensis.siswa_id', '=', 'siswas.id')
                ->where('absensis.tanggal', $tanggal)
                ->distinct()
                ->count(DB::raw('siswas.kelas_id'));
        }

        // Detailed Attendance Data (for stat detail dialog) - kosong jika tanggal di luar tahun aktif
        $detailStatus = $request->query('status');

        $detailedAttendance = [];
        if ($detailStatus && ! $isOutOfYear) {
            $query = Absensi::with(['siswa.kelas', 'guru'])
                ->where('tanggal', $tanggal)
                ->where('status', $detailStatus);

            $detailedAttendance = $query->orderBy('jam_ke')->get()->map(function ($absensi) {
                return [
                    'id' => $absensi->id,
                    'jam_ke' => $absensi->jam_ke,
                    'status' => $absensi->status,
                    'keterangan' => $absensi->keterangan,
                    'bukti' => $absensi->bukti,
                    'siswa' => [
                        'nis' => $absensi->siswa->nis,
                        'nama' => $absensi->siswa->nama,
                    ],
                    'kelas' => $absensi->siswa->kelas ? $absensi->siswa->kelas->nama_kelas : '-',
                    'guru' => $absensi->guru ? $absensi->guru->nama : '-',
                ];
            });
        }

        $studentsPerKelas = Siswa::where('siswas.is_alumni', false)
            ->join('kelas', 'siswas.kelas_id', '=', 'kelas.id')
            ->select('kelas.id', 'kelas.nama_kelas', DB::raw('count(siswas.id) as count'))
            ->groupBy('kelas.id', 'kelas.nama_kelas')
            ->get()
            ->map(function ($row) {
                return [
                    'id' => $row->id,
                    'nama_kelas' => $row->nama_kelas,
                    'count' => (int) $row->count,
                ];
            });

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'total_admin' => User::where('role', 'admin')->count(),
                'total_siswa' => Siswa::where('is_alumni', false)->count(),
                'total_guru' => Guru::count(),
                'total_kelas' => Kelas::count(),
            ],
            'attendanceToday' => array_merge($attendanceStats, ['kelas' => $kelasSudahAbsen]),
            'filters' => [
                'tanggal' => $tanggal,
            ],
            'activeYear' => $activeYear,
            'isOutOfYear' => $isOutOfYear,
            'detailedAttendance' => $detailedAttendance,
            'studentsPerKelas' => $studentsPerKelas,
            'kelasList' => Kelas::orderBy('nama_kelas', 'asc')->get(),
            'gurus' => Guru::with(['kelas'])->orderBy('nama')->get()->map(function ($guru) {
                return [
                    'id' => $guru->id,
                    'nama' => $guru->nama,
                    'nip' => $guru->nip,
                    'kelasList' => $guru->kelas->map(function ($kelas) {
                        return [
                            'id' => $kelas->id,
                            'nama_kelas' => $kelas->nama_kelas,
                            'full_nama_kelas' => $kelas->full_nama_kelas,
                        ];
                    }),
                ];
            }),
        ]);
    }
}
