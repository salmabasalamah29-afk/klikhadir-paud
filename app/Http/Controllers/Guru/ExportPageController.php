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
use Illuminate\Support\Collection;
use Inertia\Inertia;

class ExportPageController extends Controller
{
    private function formatTanggalIndonesia(?string $date): string
    {
        if (! $date) {
            return '-';
        }

        return Carbon::parse($date)->locale('id')->translatedFormat('l, j F Y');
    }

    private function normalizeDate(mixed $date): ?string
    {
        if (! is_string($date) || trim($date) === '') {
            return null;
        }

        try {
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<int, string>
     */
    private function resolveDateRange(?string $startDate, ?string $endDate): array
    {
        if (! $startDate && ! $endDate) {
            return [];
        }

        $start = Carbon::parse($startDate ?? $endDate);
        $end = Carbon::parse($endDate ?? $startDate);

        if ($start->gt($end)) {
            [$start, $end] = [$end, $start];
        }

        $dates = [];

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $dates[] = $date->format('Y-m-d');
        }

        return $dates;
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    private function normalizeRange(?string $startDate, ?string $endDate): array
    {
        if (! $startDate && ! $endDate) {
            return [null, null];
        }

        $start = Carbon::parse($startDate ?? $endDate);
        $end = Carbon::parse($endDate ?? $startDate);

        if ($start->gt($end)) {
            [$start, $end] = [$end, $start];
        }

        return [$start->format('Y-m-d'), $end->format('Y-m-d')];
    }

    private function formatPeriode(?string $startDate, ?string $endDate): string
    {
        if (! $startDate && ! $endDate) {
            return 'Semua Tanggal';
        }

        $start = Carbon::parse($startDate ?? $endDate);
        $end = Carbon::parse($endDate ?? $startDate);

        if ($start->gt($end)) {
            [$start, $end] = [$end, $start];
        }

        if ($start->isSameDay($end)) {
            return $this->formatTanggalIndonesia($start->format('Y-m-d'));
        }

        return $this->formatTanggalIndonesia($start->format('Y-m-d')).' s/d '.$this->formatTanggalIndonesia($end->format('Y-m-d'));
    }

    private function baseStyles(): string
    {
        return '
            body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#000;margin:20px;line-height:1.45}
            .header-meta{border-collapse:collapse;margin-bottom:24px}
            .header-meta td{border:none;padding:2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;vertical-align:top;line-height:1.5}
            .header-meta .meta-title{font-family:Arial,Helvetica,sans-serif;font-size:13pt;font-weight:normal;padding-bottom:8px}
            .meta-period{white-space:nowrap}
            table.data-table{border-collapse:collapse;table-layout:fixed}
            table.data-table th,table.data-table td{border:1px solid #000;padding:8px 10px;font-family:Arial,Helvetica,sans-serif;font-size:10pt;vertical-align:middle;color:#000;background:#fff;word-wrap:break-word;white-space:normal}
            table.data-table th{font-weight:bold;text-align:center;background:#F2F4FF}
            table.data-table th.block-title{padding:9px 10px;font-family:Arial,Helvetica,sans-serif;font-size:11pt;text-align:left;white-space:normal}
            table.data-table th.cell-no,table.data-table td.cell-no{width:32px;padding:8px 3px;text-align:center}
            .cell-center{text-align:center}
            .cell-nowrap{white-space:nowrap}
            .cell-text{mso-number-format:"\@";text-align:center;white-space:nowrap}
            .cell-keterangan{white-space:normal}
        ';
    }

    private function openHtml(string $title): string
    {
        $html = "\xEF\xBB\xBF";
        $html .= '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
        $html .= '<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta charset="UTF-8">';
        $html .= '<title>'.e($title).'</title>';
        $html .= '<style>'.$this->baseStyles().'</style>';
        $html .= '</head><body>';

        return $html;
    }

    public function index(Request $request)
    {
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
        [$startDate, $endDate] = $this->normalizeRange(
            $this->normalizeDate($request->query('start_date')),
            $this->normalizeDate($request->query('end_date')),
        );

        if ($type === 'kelas') {
            return $this->exportSiswa($request, $startDate, $endDate);
        }

        if ($type === 'guru') {
            return $this->exportGuru($request, $startDate, $endDate);
        }

        return back()->with('error', 'Tipe ekspor tidak valid.');
    }

    private function exportSiswa(Request $request, ?string $startDate, ?string $endDate)
    {
        $kelasIds = $request->query('kelas_ids', []);
        if (empty($kelasIds)) {
            return back()->with('error', 'Pilih minimal satu Kelas.');
        }

        /** @var Collection<int, Kelas> $kelasList */
        $kelasList = Kelas::whereIn('id', $kelasIds)->orderBy('nama_kelas', 'asc')->get();

        $dates = $this->resolveDateRange($startDate, $endDate);

        $absensiQuery = Absensi::with('siswa')
            ->whereHas('siswa', fn ($query) => $query->whereIn('kelas_id', $kelasList->pluck('id'))->where('is_alumni', false))
            ->when($startDate, fn ($query) => $query->where('tanggal', '>=', $startDate))
            ->when($endDate, fn ($query) => $query->where('tanggal', '<=', $endDate))
            ->orderBy('tanggal', 'asc')
            ->orderBy('updated_at', 'desc')
            ->orderBy('id', 'desc');

        if ($dates !== []) {
            $absensiQuery->whereIn('tanggal', $dates);
        }

        $absensis = $absensiQuery->get();

        if ($dates === []) {
            $dates = $absensis
                ->map(fn (Absensi $absensi) => $absensi->tanggal ? Carbon::parse($absensi->tanggal)->format('Y-m-d') : null)
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();
        }

        $grouped = $absensis
            ->filter(fn (Absensi $absensi) => $absensi->siswa && $absensi->tanggal)
            ->groupBy(fn (Absensi $absensi) => Carbon::parse($absensi->tanggal)->format('Y-m-d').'|'.$absensi->siswa->kelas_id)
            ->map(fn (Collection $group) => $group
                ->unique('siswa_id')
                ->sortBy(fn (Absensi $absensi) => $absensi->siswa?->nisn ?? '')
                ->values());

        $html = $this->openHtml('Presensi Siswa');

        $html .= '<table class="header-meta"><tbody>';
        $html .= '<tr><td class="meta-title" style="font-weight:normal">Ekspor : Presensi Siswa</td></tr>';
        $html .= '<tr><td class="meta-period">Periode : '.e($this->formatPeriode($startDate, $endDate)).'</td></tr>';
        $html .= '</tbody></table><br>';

        foreach ($dates as $date) {
            foreach ($kelasList as $kelas) {
                $records = $grouped->get($date.'|'.$kelas->id, collect());

                if ($records->isEmpty()) {
                    continue;
                }

                $html .= '<table class="data-table" border="1" cellspacing="0" cellpadding="0" style="width:740px">';
                $html .= '<colgroup>';
                $html .= '<col style="width:32px">';
                $html .= '<col style="width:100px">';
                $html .= '<col style="width:258px">';
                $html .= '<col style="width:90px">';
                $html .= '<col style="width:260px">';
                $html .= '</colgroup>';
                $html .= '<thead>';
                $html .= '<tr><th class="block-title" colspan="5">Kelas: '.e($kelas->full_nama_kelas).'</th></tr>';
                $html .= '<tr><th class="block-title" colspan="5">Tanggal: '.e($this->formatTanggalIndonesia($date)).'</th></tr>';
                $html .= '<tr><th class="cell-no">NO</th><th>NISN</th><th>NAMA SISWA</th><th>STATUS</th><th>KETERANGAN</th></tr>';
                $html .= '</thead><tbody>';

                $no = 1;

                foreach ($records as $absensi) {
                    $html .= '<tr>';
                    $html .= '<td class="cell-no">'.$no++.'</td>';
                    $html .= '<td class="cell-text" style="mso-number-format:\'\\@\'">'.e($absensi->siswa?->nisn ?? '-').'</td>';
                    $html .= '<td>'.e($absensi->siswa?->nama ?? '-').'</td>';
                    $html .= '<td class="cell-center cell-nowrap">'.e(ucfirst($absensi->status)).'</td>';
                    $html .= '<td class="cell-keterangan">'.e($absensi->keterangan ?: '-').'</td>';
                    $html .= '</tr>';
                }

                $html .= '</tbody></table><br>';
            }
        }

        $html .= '</body></html>';

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="rekap-presensi-siswa.xls"')
            ->header('Content-Transfer-Encoding', 'binary');
    }

    private function exportGuru(Request $request, ?string $startDate, ?string $endDate)
    {
        $guruIds = $request->query('guru_ids', []);
        if (empty($guruIds)) {
            return back()->with('error', 'Pilih minimal satu Guru.');
        }

        $users = User::whereIn('id', $guruIds)
            ->where('role', 'guru')
            ->with('guru')
            ->orderBy('name', 'asc')
            ->get();

        $namaGuru = $users
            ->map(fn (User $user) => $user->guru?->nama ?? $user->name)
            ->filter()
            ->join(', ');

        $presensis = GuruPresensi::whereIn('user_id', $users->pluck('id'))
            ->when($startDate, fn ($query) => $query->where('tanggal', '>=', $startDate))
            ->when($endDate, fn ($query) => $query->where('tanggal', '<=', $endDate))
            ->orderBy('tanggal', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $html = $this->openHtml('Presensi Guru');

        $html .= '<table class="header-meta"><tbody>';
        $html .= '<tr><td class="meta-title">Ekspor : Presensi Guru</td></tr>';
        $html .= '<tr><td>Nama Guru : '.e($namaGuru !== '' ? $namaGuru : '-').'</td></tr>';
        $html .= '<tr><td>Periode : '.e($this->formatPeriode($startDate, $endDate)).'</td></tr>';
        $html .= '</tbody></table><br>';

        $html .= '<table class="data-table" border="1" cellspacing="0" cellpadding="0" style="width:740px">';
        $html .= '<colgroup>';
        $html .= '<col style="width:32px">';
        $html .= '<col style="width:230px">';
        $html .= '<col style="width:90px">';
        $html .= '<col style="width:388px">';
        $html .= '</colgroup>';
        $html .= '<thead><tr><th class="cell-no">NO</th><th>HARI &amp; TANGGAL</th><th>STATUS</th><th>KETERANGAN</th></tr></thead>';
        $html .= '<tbody>';

        $no = 1;

        foreach ($presensis as $presensi) {
            $html .= '<tr>';
            $html .= '<td class="cell-no">'.$no++.'</td>';
            $html .= '<td class="cell-nowrap">'.e($this->formatTanggalIndonesia($presensi->tanggal)).'</td>';
            $html .= '<td class="cell-center cell-nowrap">'.e(ucfirst($presensi->status)).'</td>';
            $html .= '<td class="cell-keterangan">'.e($presensi->keterangan ?: '-').'</td>';
            $html .= '</tr>';
        }

        $html .= '</tbody></table>';
        $html .= '</body></html>';

        return response($html)
            ->header('Content-Type', 'application/vnd.ms-excel; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="rekap-presensi-guru.xls"')
            ->header('Content-Transfer-Encoding', 'binary');
    }
}
