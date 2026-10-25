<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ArsipPresensi;
use App\Models\Kelas;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlumniController extends Controller
{
    public function tahun(Request $request)
    {
        $tahunList = TahunAjaran::whereHas('arsipPresensis', fn ($q) => $q->where('is_alumni', true))
            ->withCount(['arsipPresensis as alumni_count' => fn ($q) => $q->where('is_alumni', true)])
            ->orderByRaw('CAST(tahun_awal AS UNSIGNED) DESC')
            ->get();

        return Inertia::render('admin/alumni/tahun', ['tahunList' => $tahunList]);
    }

    public function kelas(Request $request, TahunAjaran $tahunAjaran)
    {
        $kelasIds = ArsipPresensi::where('tahun_ajaran_id', $tahunAjaran->id)->where('is_alumni', true)->distinct()->pluck('kelas_id');
        $kelasList = Kelas::whereIn('id', $kelasIds)->orderBy('nama_kelas')->get()
            ->map(fn ($k) => [
                'id' => $k->id,
                'full_nama_kelas' => $k->full_nama_kelas,
                'nama_kelas' => $k->nama_kelas,
                'alumni_count' => ArsipPresensi::where('tahun_ajaran_id', $tahunAjaran->id)->where('kelas_id', $k->id)->where('is_alumni', true)
                    ->selectRaw('COUNT(DISTINCT COALESCE(siswa_nis, siswa_id)) as c')->value('c') ?? 0,
            ]);

        return Inertia::render('admin/alumni/kelas', ['tahunAjaran' => $tahunAjaran, 'kelasList' => $kelasList]);
    }

    public function detail(Request $request, TahunAjaran $tahunAjaran, Kelas $kelas)
    {
        $rows = ArsipPresensi::where('tahun_ajaran_id', $tahunAjaran->id)->where('kelas_id', $kelas->id)->where('is_alumni', true)
            ->orderBy('siswa_nama')->get()
            ->unique(fn ($a) => $a->siswa_nis ?? $a->siswa_id)
            ->values()
            ->map(fn ($a) => [
                'nis' => $a->siswa_nis ?? $a->siswa?->nis ?? '-',
                'nama' => $a->siswa_nama ?? $a->siswa?->nama ?? '-',
                'foto_url' => $a->siswa_foto_url ?? $a->siswa?->foto_url,
                'kelas' => $a->kelas?->full_nama_kelas ?? $kelas->full_nama_kelas,
            ]);

        return Inertia::render('admin/alumni/detail', ['tahunAjaran' => $tahunAjaran, 'kelas' => $kelas, 'records' => $rows]);
    }
}
