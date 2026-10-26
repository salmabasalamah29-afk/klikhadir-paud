<?php

namespace App\Http\Controllers\Guru;

use App\Http\Controllers\Controller;
use App\Models\Absensi;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AbsensiController extends Controller
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
                        ->orderBy('updated_at', 'desc');
                }])
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
                        'bukti' => $absensi->bukti,
                    ] : null,
                ];
            })->values()->all();
        }

        return Inertia::render('guru/absensi/index', [
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

    public function store(Request $request)
    {
        if (! TahunAjaran::isDateInActiveYear($request->input('tanggal'))) {
            return back()->with('error', 'Tanggal tidak valid untuk tahun ajaran aktif.');
        }

        $validated = $request->validate([
            'siswa_id' => 'required|exists:siswas,id',
            'tanggal' => 'required|date',
            'status' => 'required|in:hadir,sakit,izin',
            'keterangan' => 'nullable|string|max:255',
        ], [
            'status.required' => 'Status kehadiran wajib dipilih.',
            'status.in' => 'Status harus Hadir, Sakit, atau Izin.',
        ]);

        $guruId = $request->user()->guru?->id;
        if (! $guruId) {
            return back()->with('error', 'Data guru tidak ditemukan.');
        }

        Absensi::updateOrCreate(
            [
                'siswa_id' => $validated['siswa_id'],
                'tanggal' => $validated['tanggal'],
            ],
            [
                'guru_id' => $guruId,
                'status' => $validated['status'],
                'keterangan' => $validated['status'] === 'izin' ? ($validated['keterangan'] ?? null) : null,
            ]
        );

        return back()->with('success', 'Status kehadiran berhasil disimpan.');
    }

    public function bulkStore(Request $request)
    {
        if (! TahunAjaran::isDateInActiveYear($request->input('tanggal'))) {
            return back()->with('error', 'Tanggal tidak valid untuk tahun ajaran aktif.');
        }

        $validated = $request->validate([
            'kelas_id' => 'required|exists:kelas,id',
            'tanggal' => 'required|date',
            'absensis' => 'required|array|min:1',
            'absensis.*.siswa_id' => 'required|exists:siswas,id',
            'absensis.*.status' => 'required|in:hadir,sakit,izin',
            'absensis.*.keterangan' => 'nullable|string|max:255',
        ], [
            'absensis.required' => 'Data presensi wajib diisi.',
            'absensis.*.status.required' => 'Status kehadiran wajib dipilih.',
            'absensis.*.status.in' => 'Status harus Hadir, Sakit, atau Izin.',
        ]);

        $guruId = $request->user()->guru?->id;
        if (! $guruId) {
            return back()->with('error', 'Data guru tidak ditemukan.');
        }

        $tanggal = $validated['tanggal'];

        foreach ($validated['absensis'] as $item) {
            Absensi::updateOrCreate(
                [
                    'siswa_id' => $item['siswa_id'],
                    'tanggal' => $tanggal,
                ],
                [
                    'guru_id' => $guruId,
                    'status' => $item['status'],
                    'keterangan' => $item['status'] === 'izin' ? ($item['keterangan'] ?? null) : null,
                ]
            );
        }

        return back()->with('success', 'Validasi kehadiran berhasil disimpan ('.count($validated['absensis']).' siswa).');
    }

    public function destroy(string $id)
    {
        $absensi = Absensi::findOrFail($id);
        $absensi->delete();

        return back()->with('success', 'Status kehadiran berhasil direset.');
    }
}
