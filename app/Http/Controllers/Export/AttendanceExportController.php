<?php

namespace App\Http\Controllers\Export;

use App\Http\Controllers\Controller;
use App\Models\Absensi;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\TahunAjaran;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AttendanceExportController extends Controller
{
    private function validateActiveRange(?string $startDate, ?string $endDate): ?string
    {
        if ($startDate && ! TahunAjaran::isDateInActiveYear($startDate)) {
            return 'Tanggal tidak valid untuk tahun ajaran aktif.';
        }
        if ($endDate && ! TahunAjaran::isDateInActiveYear($endDate)) {
            return 'Tanggal tidak valid untuk tahun ajaran aktif.';
        }

        return null;
    }

    public function export(Request $request)
    {
        $valRange = $this->validateActiveRange($request->query('start_date'), $request->query('end_date'));
        if ($valRange) {
            return back()->with('error', $valRange);
        }
        $guruId = $request->query('guru_id');
        $kelasIds = $request->query('kelas_ids', []);
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $simple = $request->query('simple') === '1';

        $lihatAbsensi = $request->query('lihat_absensi') === '1';

        if ($request->user()->role === 'guru') {
            $guru = $request->user()->guru;
            if (! $guru) {
                return back()->with('error', 'Profil guru tidak ditemukan.');
            }
            $guruId = $guru->id;

            if ($lihatAbsensi && $simple) {
                if (empty($kelasIds)) {
                    return back()->with('error', 'Pilih Kelas di filter atas terlebih dahulu.');
                }
                $html = $this->generateLihatAbsensiExcel($kelasIds, $startDate, $endDate);
                $kelasNama = Kelas::whereIn('id', $kelasIds)->first()?->full_nama_kelas ?? 'kelas';
                $safeKelas = Str::slug($kelasNama, '-');
                $safeKelas = Str::limit($safeKelas, 20, '');
                $filename = 'rekap-presensi-'.$safeKelas.'-'.($startDate ?: 'semua').'.xls';

                return $this->safeExcelResponse($html, $filename);
            }

            if ($simple) {
                if (empty($kelasIds)) {
                    return back()->with('error', 'Pilih minimal satu Kelas untuk ekspor.');
                }

                $html = $this->generateSimpleExcel($guru, $kelasIds, [], $startDate, $endDate);
                $kelasNama = Kelas::whereIn('id', $kelasIds)->first()?->full_nama_kelas ?? 'kelas';
                $safeKelas = Str::slug($kelasNama, '-');
                $safeKelas = Str::limit($safeKelas, 20, '');
                $filename = 'rekap-presensi-'.$safeKelas.'-'.($startDate ?: 'semua').'.xls';

                return $this->safeExcelResponse($html, $filename);
            }
        }

        if (! $guruId) {
            return back()->with('error', 'Parameter guru diperlukan.');
        }

        $guru = Guru::findOrFail($guruId);

        $html = $this->generateSimpleExcel($guru, $kelasIds, [], $startDate, $endDate);

        $safeGuru = Str::slug($guru->nama, '-');
        $safeGuru = Str::limit($safeGuru, 25, '');
        $safeGuru = $safeGuru !== '' ? $safeGuru : 'guru';
        $filename = 'rekap-presensi-'.$safeGuru.'.xls';

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

    private function generateLihatAbsensiExcel($kelasIds, $startDate, $endDate): string
    {
        $kelasIds = (array) $kelasIds;
        $kelasList = Kelas::whereIn('id', $kelasIds)->orderBy('id')->get();

        $query = Absensi::with(['siswa.kelas'])
            ->whereHas('siswa', function ($q) use ($kelasIds) {
                $q->whereIn('kelas_id', $kelasIds);
            });

        if ($startDate) {
            $query->where('tanggal', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('tanggal', '<=', $endDate);
        }

        $raw = $query->orderBy('tanggal', 'asc')->orderBy('updated_at', 'desc')->get();

        $html = "\xEF\xBB\xBF";
        $html .= '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        $html .= '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta charset="UTF-8">';
        $html .= '<style>
            body{font-family:Calibri, Arial, sans-serif;font-size:12px;color:#000;line-height:1.45}
            table{border-collapse:collapse;width:100%;table-layout:auto}
            th,td{border:1px solid #000;padding:10px 12px;text-align:left;vertical-align:middle;color:#000;background:#fff;word-wrap:break-word;font-size:12px}
            th{font-weight:bold;text-align:center;background:#F2F4FF;color:#000}
            th.mapel-head{ text-align:left; }
            .header-meta td{border:none;padding:4px 10px;font-size:12px}
            .header-meta{margin-bottom:48px}
            .title-row td{font-weight:bold;font-size:12px;text-align:left;border:1px solid #000;background:#E8EEFF;color:#002399;padding:10px 12px}
        </style>';
        $html .= '</head><body>';

        if ($kelasList->isNotEmpty()) {
            $html .= '<table class="header-meta">';
            foreach ($kelasList as $kls) {
                $html .= '<tr><td style="font-weight:bold;width:90px;white-space:nowrap">Kelas</td><td style="white-space:nowrap">: '.e($kls->full_nama_kelas).'</td></tr>';
            }
            if ($startDate || $endDate) {
                $periode = ($startDate ?: '...').' s/d '.($endDate ?: '...');
                $html .= '<tr><td style="font-weight:bold;white-space:nowrap">Periode</td><td style="white-space:nowrap">: '.e($periode).'</td></tr>';
            }
            $html .= '</table>';
            $html .= '<table style="border:none;width:100%"><tr><td style="border:none;height:32px;background:transparent">&nbsp;</td></tr></table>';
            $html .= '<div style="height:21px;line-height:21px;border:none;background:transparent;mso-height-source:userset">&nbsp;</div>';
        }

        if ($raw->isEmpty()) {
            $html .= '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%;border:1px solid #000;">';
            $html .= '<thead><tr>';
            $html .= '<th style="width:38px">No</th>';
            $html .= '<th style="width:58px">NIS</th>';
            $html .= '<th style="min-width:260px">Nama</th>';
            $html .= '<th style="width:125px">Kelas</th>';
            $html .= '<th style="width:95px">Tanggal</th>';
            $html .= '<th style="width:105px">Status</th>';
            $html .= '</tr></thead><tbody>';
            $html .= '<tr><td colspan="6" style="text-align:center;padding:24px;">Tidak ada data untuk filter ini.</td></tr>';
            $totalSiswa = Siswa::whereIn('kelas_id', $kelasIds)->count();
            $html .= '<tr><td colspan="6" style="font-weight:bold; text-align:left; border:1px solid #000; padding:10px 12px;background:#F8FAFF">Total: '.$totalSiswa.' siswa</td></tr>';
            $html .= '</tbody></table></body></html>';

            return $html;
        }

        $kelasOrder = $kelasList->pluck('id')->toArray();
        $kelasPos = array_flip($kelasOrder);
        $groupedRaw = $raw->groupBy(function ($item) {
            return $item->siswa_id.'_'.$item->tanggal;
        });
        $merged = $groupedRaw->map(function ($group) {
            $sortedGroup = $group->sort(function ($a, $b) {
                $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                if ($ta === $tb) {
                    return $b->id <=> $a->id;
                }

                return $tb <=> $ta;
            })->values();
            $berhalangan = $sortedGroup->first(function ($it) {
                return in_array($it->status, ['sakit', 'izin', 'dispensasi', 'alpha'], true);
            });
            $primary = $berhalangan ?? $sortedGroup->first();
            if (! $primary) {
                return null;
            }
            if (empty($primary->bukti)) {
                $latestBukti = $sortedGroup->first(function ($it) {
                    return ! empty($it->bukti);
                });
                if ($latestBukti) {
                    $primary->setAttribute('bukti', $latestBukti->bukti);
                }
            }
            if ($primary->status === 'alpha' && empty(trim((string) $primary->keterangan))) {
                $withKet = $sortedGroup->first(function ($it) {
                    return $it->status === 'alpha' && ! empty(trim((string) $it->keterangan));
                });
                if ($withKet) {
                    $primary->setAttribute('keterangan', $withKet->keterangan);
                }
            }

            return $primary;
        })->filter()->values();
        $sorted = $merged->sortBy(function ($a) use ($kelasPos) {
            $pos = $kelasPos[$a->siswa?->kelas_id ?? 0] ?? 9999;
            $nis = $a->siswa?->nis;
            $nisKey = $nis && is_numeric($nis) ? str_pad((string) $nis, 10, '0', STR_PAD_LEFT) : ($a->siswa?->nama ?? '');

            return sprintf('%04d_%s_%s', $pos, $a->tanggal, $nisKey);
        })->values();

        $grouped = $sorted->groupBy('tanggal');
        $hasKeteranganGlobal = $sorted->contains(function ($a) {
            return $a->keterangan !== null && trim((string) $a->keterangan) !== '' && trim((string) $a->keterangan) !== '-';
        });
        $isFirstTable = true;

        foreach ($grouped as $tanggal => $dateGroup) {
            $formattedPeriode = Carbon::parse($tanggal)->format('d-m-Y');
            $kelasNamaTitle = $kelasList->first()?->full_nama_kelas ?? $dateGroup->first()?->siswa?->kelas?->full_nama_kelas ?? '-';
            $hasKeteranganThisDate = $dateGroup->contains(function ($a) {
                return $a->keterangan !== null && trim((string) $a->keterangan) !== '' && trim((string) $a->keterangan) !== '-';
            });
            $showKeteranganThisTable = $hasKeteranganGlobal;
            $colCount = $showKeteranganThisTable ? 7 : 6;

            $html .= '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%;border:1px solid #000;">';
            $html .= '<tr class="title-row"><td colspan="'.$colCount.'" style="font-size:12px">'.e($kelasNamaTitle).' &nbsp;&bull;&nbsp; '.e($formattedPeriode).'</td></tr>';
            $html .= '<thead><tr>';
            $html .= '<th style="width:38px">No</th>';
            $html .= '<th style="width:58px">NIS</th>';
            $html .= '<th style="min-width:260px">Nama</th>';
            $html .= '<th style="width:125px">Kelas</th>';
            $html .= '<th style="width:95px">Tanggal</th>';
            $html .= '<th style="width:105px">Status</th>';
            if ($showKeteranganThisTable) {
                $html .= '<th style="min-width:180px">Keterangan</th>';
            }
            $html .= '</tr></thead><tbody>';

            $no = 1;
            foreach ($dateGroup as $abs) {
                $nis = $abs->siswa?->nis ?? '-';
                $nama = $abs->siswa?->nama ?? '-';
                $kelasNama = $abs->siswa?->kelas?->full_nama_kelas ?? $kelasNamaTitle;
                $tgl = $abs->tanggal ? Carbon::parse($abs->tanggal)->format('d-m-Y') : '-';
                $status = ucfirst($abs->status ?? '-');
                $html .= '<tr>';
                $html .= '<td style="text-align:center;">'.$no++.'</td>';
                $html .= '<td style="mso-number-format:\@;text-align:center;">'.e($nis).'</td>';
                $html .= '<td style="white-space:normal;word-wrap:break-word;min-width:260px">'.e($nama).'</td>';
                $html .= '<td style="text-align:center;white-space:nowrap;">'.e($kelasNama).'</td>';
                $html .= '<td style="text-align:center;mso-number-format:\@;white-space:nowrap">'.e($tgl).'</td>';
                $html .= '<td style="text-align:center;white-space:nowrap">'.e($status).'</td>';
                if ($showKeteranganThisTable) {
                    $ket = ($abs->keterangan && trim((string) $abs->keterangan) !== '') ? $abs->keterangan : '-';
                    $html .= '<td style="white-space:normal;word-wrap:break-word">'.e($ket).'</td>';
                }
                $html .= '</tr>';
            }

            $totalSiswa = $dateGroup->pluck('siswa.id')->unique()->count();
            if ($totalSiswa === 0) {
                $totalSiswa = $dateGroup->count();
            }
            $html .= '<tr><td colspan="'.$colCount.'" style="font-weight:bold; text-align:left; border:1px solid #000; padding:10px 12px;background:#F8FAFF">Total: '.$totalSiswa.' siswa</td></tr>';
            $html .= '</tbody></table>';

            $html .= '<table style="border:none;width:100%"><tr><td style="border:none;height:35px;background:transparent">&nbsp;</td></tr></table>';
            $html .= '<div style="height:27px;line-height:27px;border:none;background:transparent;mso-height-source:userset">&nbsp;</div>';

            $isFirstTable = false;
        }

        $html .= '</body></html>';

        return $html;
    }

    private function generateSimpleExcel(Guru $guru, $kelasIds, $mapelIds, $startDate, $endDate): string
    {
        $allowedKelasIds = $guru->kelas()->pluck('kelas.id')->toArray();

        $filteredKelasIds = array_values(array_intersect((array) $kelasIds, $allowedKelasIds));
        if (empty($filteredKelasIds)) {
            $filteredKelasIds = $allowedKelasIds ? array_intersect((array) $kelasIds, $allowedKelasIds) : [];
        }
        if (empty($kelasIds) && ! empty($allowedKelasIds)) {
            $filteredKelasIds = $allowedKelasIds;
        }

        if (empty($filteredKelasIds)) {
            $html = "\xEF\xBB\xBF";
            $html .= '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
            $html .= '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta charset="UTF-8">';
            $html .= '<style>body{font-family:Calibri, Arial, sans-serif;font-size:12px;color:#000}table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:10px 12px;text-align:left;font-size:12px}th{font-weight:bold;text-align:center;background:#F2F4FF}th.mapel-head{text-align:left}.header-meta td{border:none;padding:4px 10px}</style>';
            $html .= '</head><body>';
            $html .= '<table class="header-meta"><tr><td style="font-weight:bold;white-space:nowrap;width:90px">Nama Guru</td><td style="white-space:nowrap">: '.e($guru->nama).'</td></tr></table>';
            $html .= '<div style="height:24px"></div>';
            $html .= '<table><thead><tr><th style="width:38px">No</th><th style="width:58px">NIS</th><th style="min-width:260px">Nama</th><th style="width:125px">Kelas</th><th style="width:95px">Tanggal</th><th style="width:110px">Jam Pembelajaran</th><th style="width:105px">Status Kehadiran</th></tr></thead><tbody>';
            $html .= '<tr><td colspan="7" style="text-align:center;padding:24px;">Tidak ada data untuk filter ini. Pastikan kelas yang dipilih termasuk yang Anda ampu.</td></tr>';
            $html .= '<tr><td colspan="7" style="font-weight:bold;">Total: 0 siswa</td></tr>';
            $html .= '</tbody></table></body></html>';

            return $html;
        }

        $kelasList = Kelas::whereIn('id', $filteredKelasIds)->orderBy('id')->get();
        $kelasOrder = $kelasList->pluck('id')->toArray();
        $kelasPos = array_flip($kelasOrder);

        $query = Absensi::with(['siswa.kelas', 'guru'])
            ->whereHas('siswa', function ($q) use ($filteredKelasIds) {
                $q->whereIn('kelas_id', $filteredKelasIds);
            })
            ->where('guru_id', $guru->id);

        if ($startDate) {
            $query->where('tanggal', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('tanggal', '<=', $endDate);
        }

        $absensis = $query->get()->sortBy(function ($a) use ($kelasPos) {
            $kelasId = $a->siswa?->kelas_id ?? 9999;
            $pos = $kelasPos[$kelasId] ?? 9999;

            return sprintf('%04d_%s_%05s_%s', $pos, $a->tanggal, str_pad((string) $a->jam_ke, 5, '0', STR_PAD_LEFT), $a->siswa?->nama ?? '');
        })->values();

        $html = "\xEF\xBB\xBF";
        $html .= '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        $html .= '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta charset="UTF-8">';
        $html .= '<style>
            body { font-family: Calibri, Arial, sans-serif; font-size: 12px; color: #000; line-height:1.45 }
            table{border-collapse:collapse;width:100%;table-layout:auto}
            th,td{border:1px solid #000;padding:10px 12px;text-align:left;vertical-align:middle;color:#000;background:#fff;word-wrap:break-word;font-size:12px}
            th{font-weight:bold;text-align:center;background:#F2F4FF}
            th.mapel-head{ text-align:left; }
            .text-center{ text-align:center; }
            .header-meta td{border:none;padding:4px 10px;font-size:12px}
            .header-meta{margin-bottom:48px}
        </style>';
        $html .= '</head><body>';

        $html .= '<table class="header-meta">';
        $html .= '<tr><td style="font-weight:bold;white-space:nowrap;width:90px">Nama Guru</td><td style="white-space:nowrap">: '.e($guru->nama).'</td></tr>';
        if ($startDate || $endDate) {
            $periode = ($startDate ?: '...').' s/d '.($endDate ?: '...');
            $html .= '<tr><td style="font-weight:bold;white-space:nowrap">Periode</td><td style="white-space:nowrap">: '.e($periode).'</td></tr>';
        }
        $html .= '</table>';
        $html .= '<table style="border:none;width:100%"><tr><td style="border:none;height:32px;background:transparent">&nbsp;</td></tr></table>';
        $html .= '<div style="height:21px;line-height:21px;border:none;background:transparent;mso-height-source:userset">&nbsp;</div>';

        $html .= '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%;border:1px solid #000;">';
        $html .= '<thead><tr>';
        $html .= '<th style="width:38px">No</th>';
        $html .= '<th style="width:58px">NIS</th>';
        $html .= '<th style="min-width:260px">Nama</th>';
        $html .= '<th style="width:125px">Kelas</th>';
        $html .= '<th style="width:95px">Tanggal</th>';
        $html .= '<th style="width:110px">Jam Pembelajaran</th>';
        $html .= '<th style="width:105px">Status Kehadiran</th>';
        $html .= '</tr></thead><tbody>';

        if ($absensis->isEmpty()) {
            $html .= '<tr><td colspan="7" style="text-align:center; padding:24px; color:#000;">Tidak ada data untuk filter ini.</td></tr>';
        } else {
            $no = 1;
            foreach ($absensis as $absensi) {
                $siswa = $absensi->siswa;
                $nis = $siswa?->nis ?? '-';
                $nama = $siswa?->nama ?? '-';
                $kelasNama = $siswa?->kelas?->full_nama_kelas ?? '-';
                $tgl = $absensi->tanggal ? Carbon::parse($absensi->tanggal)->format('d-m-Y') : '-';
                $jam = $absensi->jam_ke ?? '-';
                if ($absensi->waktu_mulai && $absensi->waktu_selesai) {
                    $jam .= ' ('.substr($absensi->waktu_mulai, 0, 5).'-'.substr($absensi->waktu_selesai, 0, 5).')';
                } elseif ($absensi->waktu_mulai) {
                    $jam .= ' ('.substr($absensi->waktu_mulai, 0, 5).')';
                }
                $status = ucfirst($absensi->status ?? '-');

                $html .= '<tr>';
                $html .= '<td class="text-center">'.$no++.'</td>';
                $html .= '<td style="mso-number-format:\@;text-align:center;">'.e($nis).'</td>';
                $html .= '<td style="white-space:normal;word-wrap:break-word;min-width:260px">'.e($nama).'</td>';
                $html .= '<td style="text-align:center;white-space:nowrap;">'.e($kelasNama).'</td>';
                $html .= '<td class="text-center" style="mso-number-format:\@;white-space:nowrap">'.e($tgl).'</td>';
                $html .= '<td class="text-center" style="white-space:nowrap;">'.e($jam).'</td>';
                $html .= '<td class="text-center" style="white-space:nowrap">'.e($status).'</td>';
                $html .= '</tr>';
            }
        }

        $totalSiswa = 0;
        if (! $absensis->isEmpty()) {
            $totalSiswa = $absensis->pluck('siswa.id')->unique()->count();
            if ($totalSiswa === 0) {
                $totalSiswa = $absensis->count();
            }
        } else {
            $totalSiswa = Siswa::whereIn('kelas_id', $filteredKelasIds)->count();
        }
        $html .= '<tr><td colspan="7" style="font-weight:bold; text-align:left; border: 1px solid #000; padding:10px 12px;background:#F8FAFF">Total: '.$totalSiswa.' siswa</td></tr>';

        $html .= '</tbody></table>';
        $html .= '</body></html>';

        return $html;
    }
}
