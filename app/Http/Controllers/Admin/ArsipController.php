<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ArsipPresensi;
use App\Models\Kelas;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ArsipController extends Controller
{
    public function tingkat(Request $request, TahunAjaran $tahunAjaran)
    {
        $hasAnyArsip = ArsipPresensi::where('tahun_ajaran_id', $tahunAjaran->id)->exists();

        return Inertia::render('admin/arsip/tingkat', ['tahunAjaran' => $tahunAjaran, 'hasAnyArsip' => $hasAnyArsip]);
    }

    public function kelas(Request $request, TahunAjaran $tahunAjaran)
    {
        $kelasIdsWithArsip = ArsipPresensi::where('tahun_ajaran_id', $tahunAjaran->id)->distinct()->pluck('kelas_id');
        $kelasList = Kelas::whereIn('id', $kelasIdsWithArsip)
            ->orderBy('nama_kelas')
            ->get();

        return Inertia::render('admin/arsip/kelas', ['tahunAjaran' => $tahunAjaran, 'kelasList' => $kelasList]);
    }

    public function detail(Request $request, TahunAjaran $tahunAjaran, Kelas $kelas)
    {
        $arsip = ArsipPresensi::with(['siswa.foto', 'kelas.jurusan', 'kelas.jenjangKelas', 'guru', 'mapel'])
            ->where('tahun_ajaran_id', $tahunAjaran->id)
            ->where('kelas_id', $kelas->id)
            ->orderBy('tanggal', 'asc')
            ->orderBy('updated_at', 'desc')
            ->get();

        // Samakan persis merging guru/DataAbsensi: berhalangan seharian prioritas + preserve bukti/keterangan
        $groupedRaw = $arsip->groupBy(fn ($a) => ($a->siswa_id ?? $a->siswa_nis ?? $a->id).'|'.$a->tanggal->format('Y-m-d'));
        $merged = $groupedRaw->map(function ($group) {
            $sorted = $group->sort(function ($a, $b) {
                $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                if ($ta === $tb) {
                    return $b->id <=> $a->id;
                }

                return $tb <=> $ta;
            })->values();
            $berhalangan = $sorted->first(fn ($it) => in_array($it->status, ['sakit', 'izin', 'dispensasi', 'alpha'], true));
            $primary = $berhalangan ?? $sorted->first();
            if (! $primary) {
                return null;
            }
            if (empty($primary->bukti)) {
                $latestBukti = $sorted->first(fn ($it) => ! empty($it->bukti));
                if ($latestBukti) {
                    $primary->setAttribute('bukti', $latestBukti->bukti);
                }
            }
            if ($primary->status === 'alpha' && empty(trim((string) $primary->keterangan))) {
                $withKet = $sorted->first(fn ($it) => $it->status === 'alpha' && ! empty(trim((string) $it->keterangan)));
                if ($withKet) {
                    $primary->setAttribute('keterangan', $withKet->keterangan);
                }
            }

            return $primary;
        })->filter()->values();

        // Urut natural NIS seperti guru/DataAbsensi, lalu tanggal asc
        $grouped = $merged->sortBy(function ($a) {
            $nis = trim((string) ($a->siswa_nis ?? $a->siswa?->nis ?? ''));
            if ($nis !== '') {
                return $a->tanggal->format('Y-m-d').'|'.$nis;
            }

            return $a->tanggal->format('Y-m-d').'|'.sprintf('%08d', $a->siswa_id ?? $a->id);
        }, SORT_NATURAL)->values();

        $stats = ['hadir' => 0, 'sakit' => 0, 'izin' => 0, 'alpha' => 0, 'dispensasi' => 0];
        foreach ($grouped as $r) {
            if (isset($stats[$r->status])) {
                $stats[$r->status]++;
            }
        }

        return Inertia::render('admin/arsip/detail', [
            'tahunAjaran' => $tahunAjaran,
            'kelas' => $kelas,
            'records' => $grouped->map(fn ($a) => [
                'id' => $a->id,
                'nis' => $a->siswa_nis ?? $a->siswa?->nis,
                'nama' => $a->siswa_nama ?? $a->siswa?->nama,
                'foto_url' => $a->siswa_foto_url ?? $a->siswa?->foto_url,
                'kelas' => $a->kelas?->full_nama_kelas,
                'is_alumni' => $a->is_alumni,
                'status' => $a->status,
                'tanggal' => $a->tanggal->format('Y-m-d'),
                'tanggal_formatted' => $a->tanggal->format('d-m-Y'),
                'jam_ke' => $a->jam_ke,
                'guru' => $a->guru?->nama ?? '-',
                'keterangan' => $a->keterangan,
                'bukti' => $a->bukti,
            ])->values(),
            'stats' => $stats,
        ]);
    }

    public function export(Request $request, TahunAjaran $tahunAjaran, Kelas $kelas)
    {
        $raw = ArsipPresensi::with(['siswa', 'guru'])
            ->where('tahun_ajaran_id', $tahunAjaran->id)
            ->where('kelas_id', $kelas->id)
            ->orderBy('tanggal', 'asc')
            ->orderBy('updated_at', 'desc')
            ->get();

        // Samakan merging dengan detail/DataAbsensi (berhalangan prioritas + preserve bukti/keterangan)
        $groupedRaw = $raw->groupBy(fn ($a) => ($a->siswa_id ?? $a->siswa_nis ?? $a->id).'|'.$a->tanggal->format('Y-m-d'));
        $merged = $groupedRaw->map(function ($group) {
            $sorted = $group->sort(function ($a, $b) {
                $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                if ($ta === $tb) {
                    return $b->id <=> $a->id;
                }

                return $tb <=> $ta;
            })->values();
            $berhalangan = $sorted->first(fn ($it) => in_array($it->status, ['sakit', 'izin', 'dispensasi', 'alpha'], true));
            $primary = $berhalangan ?? $sorted->first();
            if (! $primary) {
                return null;
            }
            if (empty($primary->bukti)) {
                $latestBukti = $sorted->first(fn ($it) => ! empty($it->bukti));
                if ($latestBukti) {
                    $primary->setAttribute('bukti', $latestBukti->bukti);
                }
            }
            if ($primary->status === 'alpha' && empty(trim((string) $primary->keterangan))) {
                $withKet = $sorted->first(fn ($it) => $it->status === 'alpha' && ! empty(trim((string) $it->keterangan)));
                if ($withKet) {
                    $primary->setAttribute('keterangan', $withKet->keterangan);
                }
            }

            return $primary;
        })->filter()->values();

        $arsip = $merged->sortBy(function ($a) {
            $nis = trim((string) ($a->siswa_nis ?? $a->siswa?->nis ?? ''));
            if ($nis !== '') {
                return $a->tanggal->format('Y-m-d').'|'.$nis;
            }

            return $a->tanggal->format('Y-m-d').'|'.sprintf('%08d', $a->siswa_id ?? $a->id);
        }, SORT_NATURAL)->values();

        $fullKelas = $kelas->full_nama_kelas ?? $kelas->nama_kelas;

        // Samakan persis format generateLihatAbsensiExcel (guru) — 1 tabel per hari, No·NIS·Nama·Kelas·Tanggal·Status·Keterangan
        $html = "\xEF\xBB\xBF";
        $html .= '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        $html .= '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta charset="UTF-8">';
        $html .= '<style>body{font-family:Calibri,Arial,sans-serif;font-size:12px;color:#000;line-height:1.45}table{border-collapse:collapse;width:100%;table-layout:auto}th,td{border:1px solid #000;padding:10px 12px;text-align:left;vertical-align:middle;color:#000;background:#fff;word-wrap:break-word;font-size:12px}th{font-weight:bold;text-align:center;background:#F2F4FF;color:#000}.header-meta td{border:none;padding:4px 10px;font-size:12px}.header-meta{margin-bottom:48px}.title-row td{font-weight:bold;font-size:12px;text-align:left;border:1px solid #000;background:#E8EEFF;color:#002399;padding:10px 12px}</style>';
        $html .= '</head><body>';

        $html .= '<table class="header-meta">';
        $html .= '<tr><td style="font-weight:bold;width:90px;white-space:nowrap">Kelas</td><td style="white-space:nowrap">: '.e($fullKelas).'</td></tr>';
        $html .= '<tr><td style="font-weight:bold;white-space:nowrap">Tahun Ajaran</td><td style="white-space:nowrap">: '.e($tahunAjaran->tahun_awal.'/'.$tahunAjaran->tahun_akhir).'</td></tr>';
        $html .= '</table>';
        $html .= '<table style="border:none;width:100%"><tr><td style="border:none;height:32px;background:transparent">&nbsp;</td></tr></table>';
        $html .= '<div style="height:21px;line-height:21px;border:none;background:transparent;mso-height-source:userset">&nbsp;</div>';

        if ($arsip->isEmpty()) {
            $html .= '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%;border:1px solid #000;">';
            $html .= '<thead><tr><th style="width:38px">No</th><th style="width:58px">NIS</th><th style="min-width:260px">Nama</th><th style="width:125px">Kelas</th><th style="width:95px">Tanggal</th><th style="width:105px">Status</th></tr></thead><tbody>';
            $html .= '<tr><td colspan="6" style="text-align:center;padding:24px;">Tidak ada data untuk filter ini.</td></tr>';
            $html .= '</tbody></table></body></html>';
            $filename = 'arsip-rekap-presensi-'.Str::slug($fullKelas).'-'.$tahunAjaran->tahun_awal.$tahunAjaran->tahun_akhir.'.xls';

            return $this->safeExcelResponse($html, $filename);
        }

        // Cek global Keterangan seperti generateLihatAbsensiExcel — hanya tabel pertama yang tampilkan kolom Keterangan jika ada
        // Cek apakah ada record dengan keterangan valid (termasuk alpha / status lain dengan keterangan)
        $hasKeteranganGlobal = $arsip->contains(fn ($a) => $a->keterangan !== null && trim((string) $a->keterangan) !== '' && trim((string) $a->keterangan) !== '-');
        $grouped = $arsip->groupBy(fn ($a) => $a->tanggal->format('Y-m-d'))->sortKeys();
        $isFirstTable = true;

        foreach ($grouped as $tanggal => $dateGroup) {
            $formattedPeriode = Carbon::parse($tanggal)->format('d-m-Y');
            $hari = Carbon::parse($tanggal)->locale('id')->isoFormat('dddd');
            $sortedDateGroup = $dateGroup->sortBy(fn ($a) => trim((string) ($a->siswa_nis ?? $a->siswa?->nis ?? sprintf('%08d', $a->siswa_id ?? $a->id))), SORT_NATURAL)->values();
            $showKeteranganThisTable = $hasKeteranganGlobal;
            $colCount = $showKeteranganThisTable ? 7 : 6;
            $html .= '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%;border:1px solid #000;">';
            $html .= '<tr class="title-row"><td colspan="'.$colCount.'" style="font-size:12px">'.e($fullKelas).' &nbsp;&bull;&nbsp; '.e(ucfirst($hari).', '.$formattedPeriode).'</td></tr>';
            $html .= '<thead><tr><th style="width:38px">No</th><th style="width:58px">NIS</th><th style="min-width:260px">Nama</th><th style="width:125px">Kelas</th><th style="width:95px">Tanggal</th><th style="width:105px">Status</th>';
            if ($showKeteranganThisTable) {
                $html .= '<th style="min-width:180px">Keterangan</th>';
            }
            $html .= '</tr></thead><tbody>';
            $no = 1;
            foreach ($sortedDateGroup as $a) {
                $html .= '<tr>';
                $html .= '<td style="text-align:center;">'.$no++.'</td>';
                $html .= '<td style="mso-number-format:\@;text-align:center;">'.e($a->siswa_nis ?? $a->siswa?->nis ?? '-').'</td>';
                $html .= '<td style="white-space:normal;word-wrap:break-word;min-width:260px">'.e($a->siswa_nama ?? $a->siswa?->nama ?? '-').'</td>';
                $html .= '<td style="text-align:center;white-space:nowrap;">'.e($a->kelas?->full_nama_kelas ?? $fullKelas).'</td>';
                $html .= '<td style="text-align:center;mso-number-format:\@;white-space:nowrap">'.e($formattedPeriode).'</td>';
                $html .= '<td style="text-align:center;white-space:nowrap">'.e(ucfirst($a->status ?? '-')).'</td>';
                if ($showKeteranganThisTable) {
                    $ket = ($a->keterangan && trim((string) $a->keterangan) !== '') ? $a->keterangan : '-';
                    $html .= '<td style="white-space:normal;word-wrap:break-word">'.e($ket).'</td>';
                }
                $html .= '</tr>';
            }
            $html .= '<tr><td colspan="'.$colCount.'" style="font-weight:bold; text-align:left; border:1px solid #000; padding:10px 12px;background:#F8FAFF">Total: '.$sortedDateGroup->count().' siswa</td></tr>';
            $html .= '</tbody></table>';
            $html .= '<table style="border:none;width:100%"><tr><td style="border:none;height:35px;background:transparent">&nbsp;</td></tr></table>';
            $html .= '<div style="height:27px;line-height:27px;border:none;background:transparent;mso-height-source:userset">&nbsp;</div>';
            $isFirstTable = false;
        }

        $html .= '</body></html>';

        $filename = 'arsip-rekap-presensi-'.Str::slug($fullKelas).'-'.$tahunAjaran->tahun_awal.$tahunAjaran->tahun_akhir.'.xls';

        return $this->safeExcelResponse($html, $filename);
    }

    private function safeExcelResponse(string $html, string $filename)
    {
        $filename = preg_replace('/[^a-zA-Z0-9\-\_\.]/', '-', $filename);
        $filename = preg_replace('/-+/', '-', $filename);
        $filename = trim($filename, '-');
        if (strlen($filename) > 80) {
            $ext = pathinfo($filename, PATHINFO_EXTENSION);
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $filename = substr($name, 0, 80 - strlen($ext) - 1).'.'.$ext;
        }

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"')
            ->header('Content-Transfer-Encoding', 'binary')
            ->header('Content-Description', 'File Transfer')
            ->header('X-Content-Type-Options', 'nosniff')
            ->header('X-Download-Options', 'open')
            ->header('Content-Length', (string) strlen($html))
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0')
            ->header('Cache-Control', 'must-revalidate, post-check=0, pre-check=0');
    }
}
