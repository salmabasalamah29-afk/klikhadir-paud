import { Head, router } from '@inertiajs/react';
import { BookOpen, Calendar, Users, TableProperties, CheckCircle, Clock, FileWarning, XCircle, Award, ImageUp, Download, FileSpreadsheet, GraduationCap, Loader2, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import DateInput, { formatTanggalIndo } from '@/components/date-input';
import SearchableSelect from '@/components/ui/searchable-select';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import guruAbsensi from '@/routes/guru/absensi';
import { exportAbsensi as guruExportAbsensi, downloadBukti as guruDownloadBukti } from '@/routes/guru';
import absensiData from '@/routes/guru/data-absensi';

interface Jurusan {
    id: number;
    nama_jurusan: string;
    singkatan: string;
}

interface Kelas {
    id: number;
    tingkat?: string | null;
    nama_kelas: string;
    full_nama_kelas?: string;
    jurusan: Jurusan | null;
}

interface AbsensiRecord {
    id: number;
    siswa_id: number;
    mapel_id: number | null;
    tanggal: string;
    jam_ke: string;
    waktu_mulai: string | null;
    waktu_selesai: string | null;
    status: 'hadir' | 'sakit' | 'izin' | 'alpha' | 'dispensasi';
    keterangan: string | null;
    bukti: string | null;
    updated_at: string | null;
    created_at: string | null;
    siswa: {
        id: number;
        nis: string;
        nama: string;
        foto_url?: string | null;
    } | null;
    kelas?: {
        id: number;
        nama_kelas: string;
        full_nama_kelas: string;
    } | null;
    guru?: {
        id: number;
        nama: string;
    } | null;
}

interface Props {
    kelasList: Kelas[];
    filters: {
        kelas_id: string | null;
        tanggal: string;
        berhalangan_hadir: boolean;
    };
    absensis: AbsensiRecord[];
    stats: {
        hadir: number;
        sakit: number;
        izin: number;
        alpha: number;
        dispensasi: number;
    };
    schedules: {
        id: number;
        jam_ke: number;
        nama?: string | null;
        waktu_mulai: string;
        waktu_selesai: string;
        hari: string;
    }[];
    jamAktif: {
        id: number;
        jam_ke: number;
        waktu_mulai: string;
        waktu_selesai: string;
        hari: string;
        nama?: string | null;
    } | null;
    guruAktif: {
        id: number | null;
        nama: string | null;
        jam_ke: number | string;
        waktu: string | null;
        updated_at?: string | null;
    } | null;
    activeYear?: { tahun_awal: string; tahun_akhir: string; start: string; end: string } | null;
    isOutOfYear?: boolean;
}

export default function GuruDataAbsensi({
    kelasList,
    filters,
    absensis = [],
    stats = { hadir: 0, sakit: 0, izin: 0, alpha: 0, dispensasi: 0 },
    jamAktif,
    guruAktif,
    activeYear,
    isOutOfYear,
}: Props) {
    useAutoRefresh(!isOutOfYear, 5000, ['absensis', 'stats', 'guruAktif']);
    // Preview: foto klik langsung full halaman, simpan juga konteks surat
    const [previewBukti, setPreviewBukti] = useState<{ url: string; id: number; nama?: string; status?: string; tanggal?: string; kelasNama?: string } | null>(null);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (!filters.kelas_id) {
            toast.error('Pilih Kelas di filter atas terlebih dahulu untuk ekspor.');
            return;
        }
        if (!exportStartDate || !exportEndDate) {
            toast.error('Pilih Tanggal Mulai dan Tanggal Selesai.');
            return;
        }
        if (activeYear && ((exportStartDate && (exportStartDate < activeYear.start || exportStartDate > activeYear.end)) || (exportEndDate && (exportEndDate < activeYear.start || exportEndDate > activeYear.end)))) {
            toast.error(`Rentang ekspor harus dalam tahun ajaran aktif ${activeYear.tahun_awal}/${activeYear.tahun_akhir} (${activeYear.start} s/d ${activeYear.end}).`);
            return;
        }
        const params = new URLSearchParams();
        params.append('kelas_ids[]', filters.kelas_id);
        params.set('start_date', exportStartDate);
        params.set('end_date', exportEndDate);
        params.set('simple', '1');
        params.set('lihat_absensi', '1'); // penanda untuk backend: format no-nis-nama-status & boleh universal

        setExporting(true);
        try {
            const response = await fetch(guruExportAbsensi.url() + '?' + params.toString(), {
                headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/html, */*' },
                credentials: 'same-origin',
            });
            if (!response.ok) {
                let msg = 'Gagal mengunduh file ekspor.';
                try {
                    const ct = response.headers.get('Content-Type') || '';
                    if (ct.includes('application/json')) {
                        const j = await response.json();
                        msg = j.message || j.error || msg;
                    } else {
                        const txt = await response.text();
                        try {
                            const j2 = JSON.parse(txt);
                            msg = j2.message || j2.error || msg;
                        } catch {
                            if (txt.includes('<!DOCTYPE') || txt.includes('<html')) {
                                msg = 'Gagal mengunduh: sesi berakhir atau data tidak valid. Silakan refresh halaman dan coba lagi.';
                            } else if (txt.trim().length > 0 && txt.trim().length < 300) {
                                msg = txt.trim().slice(0, 200) || msg;
                            }
                        }
                    }
                } catch {}
                toast.error(msg);
                return;
            }
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('text/html') && !contentType.includes('application/vnd.openxmlformats') && !contentType.includes('application/vnd.ms-excel')) {
                const txt = await response.text();
                if (txt.includes('<!DOCTYPE') || txt.includes('<html')) {
                    toast.error('Gagal mengunduh: sesi berakhir atau data tidak valid. Silakan refresh halaman dan coba lagi.');
                    return;
                }
            }
            const blob = await response.blob();
            if (blob.size < 100) {
                toast.error('Data kosong untuk filter ini.');
                return;
            }
            const disposition = response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
            const filename = filenameMatch ? filenameMatch[1] : `rekap-presensi-${filters.kelas_id}.xlsx`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success('File berhasil diunduh dan dapat diakses di perangkat Anda.');
        } catch {
            toast.error('Terjadi kesalahan saat export. Coba lagi.');
        } finally {
            setExporting(false);
        }
    };

    const handleFilterChange = (key: keyof Props['filters'], value: string | boolean) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'kelas_id') {
            newFilters.berhalangan_hadir = false;
        }
        router.get(
            absensiData.index.url(),
            newFilters as unknown as Record<string, string>,
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleBerhalanganHadirToggle = (checked: boolean) => {
        router.get(
            absensiData.index.url(),
            { ...filters, berhalangan_hadir: checked } as unknown as Record<string, string>,
            { preserveState: true, preserveScroll: true },
        );
    };

    const formatKelasName = (k: Kelas) => {
        if (k.full_nama_kelas) return k.full_nama_kelas;
        const parts: string[] = [];
        if (k.tingkat) parts.push(k.tingkat);
        if (k.jurusan?.singkatan) parts.push(k.jurusan.singkatan);
        parts.push(k.nama_kelas);
        return parts.join(' ');
    };

    // waktu update sesuai jam user akses (WIB), pakai Asia/Jakarta
    const formatWaktuUpdate = (iso: string | null) => {
        if (!iso) return '-';
        try {
            const d = new Date(iso.replace(' ', 'T'));
            if (isNaN(d.getTime())) return iso;
            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
        } catch { return iso; }
    };
    const formatTanggalUpdate = (iso: string | null) => {
        if (!iso) return '-';
        try {
            const d = new Date(iso.replace(' ', 'T'));
            if (isNaN(d.getTime())) return iso.slice(0, 10);
            return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
        } catch { return iso; }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'hadir':
                return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><CheckCircle className="h-3 w-3" /> Hadir</span>;
            case 'sakit':
                return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"><Clock className="h-3 w-3" /> Sakit</span>;
            case 'izin':
                return <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20"><FileWarning className="h-3 w-3" /> Izin</span>;
            case 'alpha':
                return <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20"><XCircle className="h-3 w-3" /> Alpha</span>;
            case 'dispensasi':
                return <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20"><Award className="h-3 w-3" /> Dispensasi</span>;
            default:
                return <span>{status}</span>;
        }
    };

    const totalAbsensi = stats.hadir + stats.sakit + stats.izin + stats.alpha + stats.dispensasi;
    const selectedKelas = kelasList.find(k => k.id.toString() === filters.kelas_id);
    // waktu update: jam guru terakhir submit (bukan jam user buka halaman) - sudah Asia/Jakarta dari backend
    const waktuUpdateDisplay = guruAktif?.updated_at ? formatWaktuUpdate(guruAktif.updated_at) + ' WIB' : '-';
    const hasKeterangan = absensis.some((r) => r.keterangan != null && r.keterangan.toString().trim() !== '');
    const hasBukti = absensis.some((r) => ['izin', 'sakit', 'dispensasi'].includes(r.status));

    // helper untuk format surat title: Kapital-nama-kelas-tanggal
    const getSuratLabel = (status: string, nama: string | undefined, kelasNama: string | undefined, tanggal: string | undefined) => {
        const jenis = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Surat';
        const nm = nama ? nama.toUpperCase().replace(/\s+/g, ' ').trim() : 'SISWA';
        // kelasNama sudah seperti "XII PPLG A"
        const kls = kelasNama ?? selectedKelas?.full_nama_kelas ?? '-';
        const tgl = formatTanggalIndo(tanggal ?? filters.tanggal);
        return `${jenis}-${nm}-${kls}-${tgl}`;
    };

    return (
        <>
            <Head title="Lihat Presensi" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Lihat Presensi</h1>
                    <p className="text-muted-foreground">Menampilkan data presensi terbaru setiap kelas yang dapat diakses oleh semua guru, dengan data presensi kelas yaitu guru terakhir melakukan presensi.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
                    <div className="col-span-1 flex flex-col gap-4">
                        <div className="relative z-20 rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border lg:sticky lg:top-8 min-h-[260px] flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Filter Data</h2>
                                <p className="text-xs text-muted-foreground mt-1">Pilih tanggal dan kelas untuk lihat rekap presensi kelas terbaru</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tanggal</label>
                                    <DateInput value={filters.tanggal} className="bg-muted/30" min={activeYear?.start} max={activeYear?.end} onChange={(iso) => handleFilterChange('tanggal', iso)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Kelas</label>
                                    <SearchableSelect
                                        value={filters.kelas_id || undefined}
                                        onValueChange={(val) => handleFilterChange('kelas_id', val)}
                                        placeholder="Pilih Kelas"
                                        items={kelasList.map(k => ({ value: k.id.toString(), label: formatKelasName(k) }))}
                                    />
                                </div>
                                {filters.kelas_id && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <Checkbox id="berhalangan-hadir" checked={filters.berhalangan_hadir} onCheckedChange={handleBerhalanganHadirToggle} />
                                        <label htmlFor="berhalangan-hadir" className="text-sm font-medium leading-none cursor-pointer select-none">Berhalangan Hadir</label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Ekspor Presensi — di bawah Filter Data, besar kolom sama presisi dengan Filter Data */}
                        <div className="relative z-10 rounded-xl border border-dashed border-sidebar-border/40 bg-card p-4 shadow-sm w-full flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <FileSpreadsheet className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">
                                    {selectedKelas?.full_nama_kelas ? `Ekspor Presensi ${selectedKelas.full_nama_kelas}` : 'Ekspor Presensi'}
                                </h2>
                            </div>
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Tanggal Mulai</label>
                                    <DateInput value={exportStartDate} onChange={(iso) => setExportStartDate(iso)} className="bg-muted/30" min={activeYear?.start} max={activeYear?.end} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Tanggal Selesai</label>
                                    <DateInput value={exportEndDate} onChange={(iso) => setExportEndDate(iso)} className="bg-muted/30" min={activeYear?.start} max={activeYear?.end} />
                                </div>
                                <div className="pt-0.5">
                                    <Button onClick={handleExport} disabled={exporting || !filters.kelas_id} className="w-full h-9 gap-1.5" title={!filters.kelas_id ? 'Pilih kelas di filter atas' : `Export kelas ${selectedKelas?.full_nama_kelas ?? ''}`}><FileSpreadsheet className="h-4 w-4" /> {exporting ? <><Loader2 className="h-4 w-4 animate-spin" />...</> : 'Ekspor'}</Button>
                                </div>
                                {!filters.kelas_id && <p className="text-xs text-amber-600">Pilih kelas di filter atas terlebih dahulu, maka export akan mengikuti kelas tersebut</p>}
                                {filters.kelas_id && <p className="text-xs text-muted-foreground">Akan mengekspor kelas <span className="font-medium">{selectedKelas?.full_nama_kelas}</span> pada rentang tanggal yang dipilih</p>}
                            </div>
                        </div>
                    </div>

                    {/* Main content — jarak antar kartu/tabel = jarak a ke b */}
                    <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
                        {filters.kelas_id ? (
                            <>
                                {/* Stats rekap */}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                                    <div className="rounded-xl border bg-card p-3 shadow-sm text-center"><p className="text-xs text-muted-foreground">Hadir</p><p className="text-xl font-bold text-emerald-600">{stats.hadir}</p></div>
                                    <div className="rounded-xl border bg-card p-3 shadow-sm text-center"><p className="text-xs text-muted-foreground">Sakit</p><p className="text-xl font-bold text-blue-600">{stats.sakit}</p></div>
                                    <div className="rounded-xl border bg-card p-3 shadow-sm text-center"><p className="text-xs text-muted-foreground">Izin</p><p className="text-xl font-bold text-orange-600">{stats.izin}</p></div>
                                    <div className="rounded-xl border bg-card p-3 shadow-sm text-center"><p className="text-xs text-muted-foreground">Alpha</p><p className="text-xl font-bold text-red-600">{stats.alpha}</p></div>
                                    <div className="rounded-xl border bg-card p-3 shadow-sm text-center"><p className="text-xs text-muted-foreground">Dispensasi</p><p className="text-xl font-bold text-indigo-600">{stats.dispensasi}</p></div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                                    <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30"><Calendar className="h-3 w-3" /> {formatTanggalIndo(filters.tanggal)}</span>
                                    <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30"><GraduationCap className="h-3 w-3" /> {selectedKelas?.full_nama_kelas ?? '-'}</span>
                                    <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30">total: {totalAbsensi} siswa</span>
                                    <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30">terakhir diperbarui: {waktuUpdateDisplay}</span>
                                </div>

                                {/* Indikator Guru dan Waktu Aktif */}
                                <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-2">
                                    <h3 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Indikator Guru dan Waktu Aktif</h3>
                                    {guruAktif?.nama ? (
                                        <div className="text-sm leading-snug">
                                            <span className="text-xs text-muted-foreground">oleh: </span>
                                            <span className="font-medium text-foreground">{guruAktif.nama}</span>
                                            <span className="text-xs text-muted-foreground"> jam ke-{guruAktif.jam_ke} {guruAktif.waktu ? `(${guruAktif.waktu})` : ''}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Belum ada pembaruan untuk kelas ini pada tanggal {formatTanggalIndo(filters.tanggal)}.</p>
                                    )}
                                </div>

                                {/* Table langsung tanpa judul - kolom seperlunya */}
                                <div className="rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border overflow-hidden flex flex-col">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-3 py-3 w-10 text-center">No</th>
                                                    <th className="px-2 py-3 w-[72px] text-center whitespace-nowrap">NIS</th>
                                                    <th className="px-4 py-3 min-w-[160px]">Nama Siswa</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    {hasKeterangan && <th className="px-4 py-3 min-w-[140px]">Keterangan</th>}
                                                    {hasBukti && <th className="px-4 py-3">Bukti</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {absensis.length === 0 ? (
                                                    <tr><td colSpan={4 + (hasKeterangan ? 1 : 0) + (hasBukti ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground"><div className="flex flex-col items-center gap-2"><Users className="h-8 w-8 opacity-20" /><p>Tidak ada data presensi untuk filter ini.</p></div></td></tr>
                                                ) : (
                                                    absensis.map((record, index) => {
                                                        const kelasNama = (record.kelas?.full_nama_kelas ?? selectedKelas?.full_nama_kelas ?? '') as string;
                                                        return (
                                                            <tr key={record.id} className="hover:bg-muted/30">
                                                                <td className="px-3 py-3 text-center text-muted-foreground text-xs">{index + 1}</td>
                                                                <td className="px-2 py-3 font-mono text-[11px] whitespace-nowrap tracking-tight text-center">{record.siswa?.nis ?? '-'}</td>
                                                                <td className="px-4 py-3 font-medium">{record.siswa?.nama ?? '-'}</td>
                                                                <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                                                                {hasKeterangan && <td className="px-4 py-3 text-xs truncate max-w-[180px]" title={record.keterangan || ''}>{record.keterangan || '-'}</td>}
                                                                {hasBukti && (
                                                                    <td className="px-4 py-3">
                                                                        {record.bukti ? (
                                                                            <button
                                                                                onClick={() => setPreviewBukti({ url: `/storage/${record.bukti}`, id: record.id, nama: record.siswa?.nama ?? '', status: record.status, tanggal: record.tanggal, kelasNama })}
                                                                                className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-muted/20 shadow-sm hover:ring-2 hover:ring-primary/20 transition-all"
                                                                                title="Lihat surat"
                                                                            >
                                                                                <img src={`/storage/${record.bukti}`} alt={`Bukti ${record.status}`} className="h-full w-full object-cover" loading="lazy" decoding="async" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
                                                                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10"><ImageUp className="h-2.5 w-2.5 text-white opacity-0 group-hover:opacity-100" /></span>
                                                                            </button>
                                                                        ) : <span className="text-xs text-muted-foreground">-</span>}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

            </div>

            {/* Dialog preview: satu bg gabung, back kiri atas, klik backdrop hitam keluar dengan space */}
            <Dialog open={previewBukti !== null} onOpenChange={(o)=>{if(!o) setPreviewBukti(null)}}>
                <DialogContent className="sm:max-w-[400px] w-auto max-h-[85vh] bg-transparent border-none shadow-none p-1 sm:p-2 [&>button]:hidden">
                    {previewBukti && (
                        <div className="bg-card rounded-xl px-4 py-4 shadow-2xl flex flex-col gap-4 relative w-full max-w-[400px] mx-auto justify-center">
                            <div className="flex items-start gap-3 pr-2">
                                <button onClick={() => setPreviewBukti(null)} className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors" aria-label="Kembali">
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-semibold leading-tight">Surat {previewBukti.status ? previewBukti.status.charAt(0).toUpperCase()+previewBukti.status.slice(1) : 'Presensi'}</h3>
                                    <p className="text-xs text-muted-foreground mt-1 font-mono break-all line-clamp-2">{getSuratLabel(previewBukti.status ?? 'surat', previewBukti.nama, previewBukti.kelasNama, previewBukti.tanggal)}.</p>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <img
                                    src={previewBukti.url}
                                    alt={`Surat ${previewBukti.status}`}
                                    className="max-w-full max-h-[50vh] rounded-lg object-contain"
                                    loading="eager"
                                    decoding="async"
                                    onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}}
                                />
                            </div>
                            <div className="flex justify-center">
                                <a
                                    href={previewBukti.url}
                                    download={`${getSuratLabel(previewBukti.status ?? 'surat', previewBukti.nama, previewBukti.kelasNama, previewBukti.tanggal)}.${previewBukti.url.split('.').pop()?.split('?')[0] || 'png'}`}
                                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-lg"
                                >
                                    <Download className="h-4 w-4" /> unduh
                                </a>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

GuruDataAbsensi.layout = {
    breadcrumbs: [
        { title: 'Guru', href: guruAbsensi.index.url() },
        { title: 'Lihat Presensi', href: absensiData.index.url() },
    ],
};
