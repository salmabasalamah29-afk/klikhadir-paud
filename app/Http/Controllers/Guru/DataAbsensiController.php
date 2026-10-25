<?php

namespace App\Http\Controllers\Guru;

use App\Http\Controllers\Controller;
use App\Models\Absensi;
use App\Models\Kelas;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DataAbsensiController extends Controller
{
    public function index(Request $request)
    {
        $selectedKelasId = $request->query('kelas_id');
        $tanggal = $request->query('tanggal', now()->toDateString());
        $berhalanganHadir = $request->query('berhalangan_hadir') === 'true';

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

        // Universal: semua guru dapat lihat semua kelas (read-only) - per kelas 1 data 1 hari
        $kelasList = Kelas::orderBy('id')->get();

        $absensis = [];
        $stats = ['hadir' => 0, 'sakit' => 0, 'izin' => 0, 'alpha' => 0, 'dispensasi' => 0];
        $schedules = collect();
        $jamAktif = null;
        $guruAktif = null;

        if ($selectedKelasId && $tanggal && ! $isOutOfYear) {
            $query = Absensi::with(['siswa.kelas', 'siswa.foto', 'guru'])
                ->whereHas('siswa', function ($q) use ($selectedKelasId) {
                    $q->where('kelas_id', $selectedKelasId)
                        ->where('is_alumni', false);
                })
                ->where('tanggal', $tanggal)
                ->orderBy('updated_at', 'desc')
                ->orderBy('id', 'desc');

            if ($berhalanganHadir) {
                $query->whereIn('status', ['sakit', 'izin', 'alpha', 'dispensasi']);
            }

            $raw = $query->get();

            // Gabungkan per siswa: status Sakit/Izin/Dispensasi/Alpha berlaku seharian
            $grouped = $raw->groupBy('siswa_id');
            $latestPerSiswa = $grouped->map(function ($group) {
                $sorted = $group->sort(function ($a, $b) {
                    $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                    $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                    if ($ta === $tb) {
                        return $b->id <=> $a->id;
                    }

                    return $tb <=> $ta;
                })->values();

                $berhalangan = $sorted->first(function ($item) {
                    return in_array($item->status, ['sakit', 'izin', 'dispensasi', 'alpha'], true);
                });
                $primary = $berhalangan ?? $sorted->first();
                if (! $primary) {
                    return null;
                }

                if (empty($primary->bukti)) {
                    $latestBukti = $sorted->first(function ($item) {
                        return ! empty($item->bukti);
                    });
                    if ($latestBukti) {
                        $primary->setAttribute('bukti', $latestBukti->bukti);
                    }
                }

                if ($primary->status === 'alpha' && empty(trim((string) $primary->keterangan))) {
                    $withKet = $sorted->first(function ($item) {
                        return $item->status === 'alpha' && ! empty(trim((string) $item->keterangan));
                    });
                    if ($withKet) {
                        $primary->setAttribute('keterangan', $withKet->keterangan);
                    }
                }

                return $primary;
            })->filter()->values();

            $latestPerSiswa = $latestPerSiswa->sortBy(function ($a) {
                $nis = trim((string) ($a->siswa?->nis ?? ''));
                if ($nis !== '') {
                    return $nis;
                }

                return sprintf('%08d', $a->siswa_id);
            }, SORT_NATURAL)->values();

            foreach ($latestPerSiswa as $abs) {
                if (isset($stats[$abs->status])) {
                    $stats[$abs->status]++;
                }
            }

            $lastUpdate = $latestPerSiswa->sortByDesc('updated_at')->first();
            if ($lastUpdate) {
                $guruAktif = [
                    'id' => $lastUpdate->guru?->id,
                    'nama' => $lastUpdate->guru?->nama,
                    'jam_ke' => $lastUpdate->jam_ke,
                    'waktu' => $lastUpdate->waktu_mulai && $lastUpdate->waktu_selesai ? substr($lastUpdate->waktu_mulai, 0, 5).' - '.substr($lastUpdate->waktu_selesai, 0, 5) : null,
                    'updated_at' => $lastUpdate->updated_at ? $lastUpdate->updated_at->timezone('Asia/Jakarta')->format('Y-m-d H:i:s') : null,
                ];
            }

            $absensis = $latestPerSiswa->map(function ($absensi) {
                $siswa = $absensi->siswa;
                $kelas = $siswa?->kelas;

                return [
                    'id' => $absensi->id,
                    'siswa_id' => $absensi->siswa_id,
                    'tanggal' => $absensi->tanggal,
                    'jam_ke' => $absensi->jam_ke,
                    'waktu_mulai' => $absensi->waktu_mulai,
                    'waktu_selesai' => $absensi->waktu_selesai,
                    'status' => $absensi->status,
                    'keterangan' => $absensi->keterangan,
                    'bukti' => $absensi->bukti,
                    'updated_at' => $absensi->updated_at ? $absensi->updated_at->timezone('Asia/Jakarta')->format('Y-m-d H:i:s') : null,
                    'created_at' => $absensi->created_at ? $absensi->created_at->timezone('Asia/Jakarta')->format('Y-m-d H:i:s') : null,
                    'siswa' => $siswa ? [
                        'id' => $siswa->id,
                        'nis' => $siswa->nis,
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
            })->values()->all();
        }

        return Inertia::render('guru/absensi/data', [
            'kelasList' => $kelasList,
            'filters' => [
                'kelas_id' => $selectedKelasId,
                'tanggal' => $tanggal,
                'berhalangan_hadir' => $berhalanganHadir,
            ],
            'absensis' => $absensis,
            'stats' => $stats,
            'schedules' => $schedules,
            'jamAktif' => $jamAktif,
            'guruAktif' => $guruAktif,
            'activeYear' => $activeYear,
            'isOutOfYear' => $isOutOfYear,
        ]);
    }
}
