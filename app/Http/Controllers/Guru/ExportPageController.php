<?php

namespace App\Http\Controllers\Guru;

use App\Http\Controllers\Controller;
use App\Models\Absensi;
use App\Models\GuruPresensi;
use App\Models\Kelas;
use App\Models\TahunAjaran;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExportPageController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $kelasList = Kelas::orderBy('nama_kelas', 'asc')->get();

        $gurus = User::where('role', 'guru')
            ->whereHas('guru')
            ->with('guru')
            ->orderBy('name', 'asc')
            ->get();

        $active = TahunAjaran::where('is_active', true)->first();
        $activeYear = null;
        if ($active) {
            try {
                $s = Carbon::create((int) $active->tahun_awal, 7, 1)->format('Y-m-d');
                $e = Carbon::create((int) $active->tahun_akhir, 6, 30)->format('Y-m-d');
                $activeYear = ['tahun_awal' => $active->tahun_awal, 'tahun_akhir' => $active->tahun_akhir, 'start' => $s, 'end' => $e];
            } catch (\Throwable $ex) {
            }
        }

        return Inertia::render('guru/absensi/export', [
            'kelasList' => $kelasList,
            'gurus' => $gurus,
            'activeYear' => $activeYear,
        ]);
    }

    public function export(Request $request)
    {
        $type = $request->query('type', 'kelas');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $active = TahunAjaran::where('is_active', true)->first();
        $activeYear = null;
        if ($active) {
            try {
                $s = Carbon::create((int) $active->tahun_awal, 7, 1)->format('Y-m-d');
                $e = Carbon::create((int) $active->tahun_akhir, 6, 30)->format('Y-m-d');
                $activeYear = ['tahun_awal' => $active->tahun_awal, 'tahun_akhir' => $active->tahun_akhir, 'start' => $s, 'end' => $e];
            } catch (\Throwable $ex) {
            }
        }

        if ($type === 'kelas') {
            $kelasIds = $request->query('kelas_ids', []);
            if (empty($kelasIds)) {
                return back()->with('error', 'Pilih minimal satu Kelas.');
            }

            $kelasList = Kelas::whereIn('id', $kelasIds)->orderBy('nama_kelas', 'asc')->get();

            $html = "\xEF\xBB\xBF";
            $html .= '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
            $html .= '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta charset="UTF-8">';
            $html .= '<style>
                body{font-family:Calibri,Arial,sans-serif;font-size:12px;color:#000;line-height:1.45}
                table{border-collapse:collapse;width:100%;table-layout:auto}
                th,td{border:1px solid #000;padding:10px 12px;text-align:left;vertical-align:middle;color:#000;background:#fff;word-wrap:break-word;font-size:12px}
                th{font-weight:bold;text-align:center;background:#F2F4FF;color:#000}
                .header-meta td{border:none;padding:4px 10px;font-size:12px}
                .header-meta{margin-bottom:48px}
                .title-row td{font-weight:bold;font-size:12px;text-align:left;border:1px solid #000;background:#E8EEFF;color:#002399;padding:10px 12px}
            </style>';
            $html .= '</head><body>';

            $html .= '<table class="header-meta">';
            $html .= '<tr><td style="font-weight:bold;width:90px;white-space:nowrap">Ekspor</td><td style="white-space:nowrap">: Presensi Kelas (Siswa)</td></tr>';
            if ($startDate || $endDate) {
                $periode = ($startDate ?: '...').' s/d '.($endDate ?: '...');
                $html .= '<tr><td style="font-weight:bold;white-space:nowrap">Periode</td><td style="white-space:nowrap">: '.$periode.'</td></tr>';
            }
            $html .= '</table>';

            foreach ($kelasList as $kelas) {
                $html .= '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%;border:1px solid #000;">';
                $html .= '<tr class="title-row"><td colspan="5">Kelas: '.e($kelas->full_nama_kelas).'</td></tr>';
                $html .= '<thead><tr><th style="width:38px">No</th><th style="width:58px">NIS</th><th style="min-width:200px">Nama Siswa</th><th style="width:100px">Tanggal</th><th style="width:100px">Status</th></tr></thead><tbody>';

                $no = 1;
                $hasData = false;

                foreach ($kelas->siswas as $siswa) {
                    if ($siswa->is_alumni) {
                        continue;
                    }

                    $absensis = Absensi::where('siswa_id', $siswa->id)
                        ->when($startDate, fn ($q) => $q->where('tanggal', '>=', $startDate))
                        ->when($endDate, fn ($q) => $q->where('tanggal', '<=', $endDate))
                        ->orderBy('tanggal', 'asc')
                        ->get();

                    foreach ($absensis as $a) {
                        $hasData = true;
                        $html .= '<tr>';
                        $html .= '<td style="text-align:center;">'.$no++.'</td>';
                        $html .= '<td style="text-align:center;">'.e($siswa->nis).'</td>';
                        $html .= '<td>'.e($siswa->nama).'</td>';
                        $html .= '<td style="text-align:center;">'.e($a->tanggal).'</td>';
                        $html .= '<td style="text-align:center;">'.e(ucfirst($a->status)).'</td>';
                        $html .= '</tr>';
                    }
                }

                $html .= '</tbody></table>';
                $html .= '<br>';
            }

            if (! $hasData) {
                $html .= '<p>Tidak ada data presensi untuk filter ini.</p>';
            }

            $html .= '</body></html>';

            $filename = 'rekap-presensi-kelas-'.date('YmdHis').'.xls';

            return response($html)
                ->header('Content-Type', 'application/vnd.ms-excel; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'"')
                ->header('Content-Transfer-Encoding', 'binary');
        }

        if ($type === 'guru') {
            $guruIds = $request->query('guru_ids', []);
            if (empty($guruIds)) {
                return back()->with('error', 'Pilih minimal satu Guru.');
            }

            $users = User::whereIn('id', $guruIds)
                ->where('role', 'guru')
                ->with('guru')
                ->orderBy('name', 'asc')
                ->get();

            $html = "\xEF\xBB\xBF";
            $html .= '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
            $html .= '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta charset="UTF-8">';
            $html .= '<style>
                body{font-family:Calibri,Arial,sans-serif;font-size:12px;color:#000;line-height:1.45}
                table{border-collapse:collapse;width:100%;table-layout:auto}
                th,td{border:1px solid #000;padding:10px 12px;text-align:left;vertical-align:middle;color:#000;background:#fff;word-wrap:break-word;font-size:12px}
                th{font-weight:bold;text-align:center;background:#F2F4FF;color:#000}
                .header-meta td{border:none;padding:4px 10px;font-size:12px}
                .header-meta{margin-bottom:48px}
                .title-row td{font-weight:bold;font-size:12px;text-align:left;border:1px solid #000;background:#E8EEFF;color:#002399;padding:10px 12px}
            </style>';
            $html .= '</head><body>';

            $html .= '<table class="header-meta">';
            $html .= '<tr><td style="font-weight:bold;width:90px;white-space:nowrap">Ekspor</td><td style="white-space:nowrap">: Rekap Presensi Guru</td></tr>';
            if ($startDate || $endDate) {
                $periode = ($startDate ?: '...').' s/d '.($endDate ?: '...');
                $html .= '<tr><td style="font-weight:bold;white-space:nowrap">Periode</td><td style="white-space:nowrap">: '.$periode.'</td></tr>';
            }
            $html .= '</table>';

            foreach ($users as $user) {
                $guru = $user->guru;
                if (! $guru) {
                    continue;
                }

                $html .= '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%;border:1px solid #000;">';
                $html .= '<tr class="title-row"><td colspan="4">Guru: '.e($user->name).'</td></tr>';
                $html .= '<thead><tr><th style="width:38px">No</th><th style="width:100px">Tanggal</th><th style="width:100px">Status</th><th style="min-width:200px">Keterangan</th></tr></thead><tbody>';

                $no = 1;
                $hasData = false;

                $presensis = GuruPresensi::where('user_id', $user->id)
                    ->when($startDate, fn ($q) => $q->where('tanggal', '>=', $startDate))
                    ->when($endDate, fn ($q) => $q->where('tanggal', '<=', $endDate))
                    ->orderBy('tanggal', 'asc')
                    ->get();

                foreach ($presensis as $p) {
                    $hasData = true;
                    $html .= '<tr>';
                    $html .= '<td style="text-align:center;">'.$no++.'</td>';
                    $html .= '<td style="text-align:center;">'.e($p->tanggal).'</td>';
                    $html .= '<td style="text-align:center;">'.e(ucfirst($p->status)).'</td>';
                    $html .= '<td>'.e($p->keterangan ?? '-').'</td>';
                    $html .= '</tr>';
                }

                $html .= '</tbody></table>';
                $html .= '<br>';
            }

            if (! $hasData) {
                $html .= '<p>Tidak ada data presensi guru untuk filter ini.</p>';
            }

            $html .= '</body></html>';

            $filename = 'rekap-presensi-guru-'.date('YmdHis').'.xls';

            return response($html)
                ->header('Content-Type', 'application/vnd.ms-excel; charset=UTF-8')
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'"')
                ->header('Content-Transfer-Encoding', 'binary');
        }

        return back()->with('error', 'Tipe ekspor tidak valid.');
    }
}
