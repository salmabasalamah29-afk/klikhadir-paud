import { Head, router } from '@inertiajs/react';
import { FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SearchableSelect from '@/components/ui/searchable-select';

interface Kelas {
    id: number;
    nama_kelas: string | null;
    full_nama_kelas: string;
}

interface GuruUser {
    id: number;
    name: string;
    guru?: {
        id: number;
        nama: string;
    };
}

interface Props {
    kelasList: Kelas[];
    gurus: GuruUser[];
    activeYear?: { tahun_awal: string; tahun_akhir: string; start: string; end: string } | null;
}

export default function GuruExportAbsensi({
    kelasList,
    gurus = [],
    activeYear,
}: Props) {
    // Form 1: Ekspor Presensi Kelas (Siswa)
    const [kelasIds1, setKelasIds1] = useState<string[]>([]);
    const [startDate1, setStartDate1] = useState('');
    const [endDate1, setEndDate1] = useState('');
    const [kelasSearch1, setKelasSearch1] = useState('');
    const [kelasOpen1, setKelasOpen1] = useState(false);
    const [exporting1, setExporting1] = useState(false);
    const kelasRef1 = useState<HTMLDivElement>(null);

    // Form 2: Ekspor Rekap Presensi Guru
    const [guruIds2, setGuruIds2] = useState<string[]>([]);
    const [startDate2, setStartDate2] = useState('');
    const [endDate2, setEndDate2] = useState('');
    const [guruSearch2, setGuruSearch2] = useState('');
    const [guruOpen2, setGuruOpen2] = useState(false);
    const [exporting2, setExporting2] = useState(false);
    const guruRef2 = useState<HTMLDivElement>(null);

    const allKelasSelected1 = kelasIds1.length === kelasList.length && kelasList.length > 0;
    const allGuruSelected2 = guruIds2.length === gurus.filter(g => g.guru).length && gurus.filter(g => g.guru).length > 0;

    const filteredKelas1 = kelasList.filter(k =>
        (k.full_nama_kelas ?? k.nama_kelas).toLowerCase().includes(kelasSearch1.toLowerCase())
    );

    const filteredGurus2 = gurus.filter(g =>
        g.guru?.nama.toLowerCase().includes(guruSearch2.toLowerCase())
    );

    const toggleKelas1 = (id: string) => {
        setKelasIds1(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
        setKelasOpen1(false);
    };

    const toggleAllKelas1 = () => {
        if (allKelasSelected1) {
            setKelasIds1([]);
        } else {
            setKelasIds1(kelasList.map(k => k.id.toString()));
        }
        setKelasOpen1(false);
    };

    const toggleGuru2 = (id: string) => {
        setGuruIds2(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
        setGuruOpen2(false);
    };

    const toggleAllGuru2 = () => {
        if (allGuruSelected2) {
            setGuruIds2([]);
        } else {
            setGuruIds2(gurus.filter(g => g.guru).map(g => g.id.toString()));
        }
        setGuruOpen2(false);
    };

    const handleExport1 = async () => {
        if (kelasIds1.length === 0) {
            toast.error('Silakan pilih Kelas untuk ekspor.');
            return;
        }
        if (activeYear && ((startDate1 && (startDate1 < activeYear.start || startDate1 > activeYear.end)) || (endDate1 && (endDate1 < activeYear.start || endDate1 > activeYear.end)))) {
            toast.error(`Rentang ekspor harus dalam tahun ajaran aktif ${activeYear.tahun_awal}/${activeYear.tahun_akhir}.`);
            return;
        }

        const params = new URLSearchParams();
        params.set('type', 'kelas');
        kelasIds1.forEach(id => params.append('kelas_ids[]', id));
        if (startDate1) params.set('start_date', startDate1);
        if (endDate1) params.set('end_date', endDate1);

        setExporting1(true);
        try {
            const response = await fetch(`${window.location.origin}/guru/export/download?${params.toString()}`, {
                headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/html, */*' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const text = await response.text();
                toast.error('Gagal mengunduh file ekspor.');
                return;
            }

            const blob = await response.blob();
            if (blob.size < 100) {
                toast.error('Data kosong untuk filter ini.');
                return;
            }

            const disposition = response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
            const filename = filenameMatch ? filenameMatch[1] : 'rekap-presensi-kelas.xlsx';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success('File ekspor berhasil diunduh.');
        } catch {
            toast.error('Terjadi kesalahan saat ekspor.');
        } finally {
            setExporting1(false);
        }
    };

    const handleExport2 = async () => {
        if (guruIds2.length === 0) {
            toast.error('Silakan pilih Guru untuk ekspor.');
            return;
        }
        if (activeYear && ((startDate2 && (startDate2 < activeYear.start || startDate2 > activeYear.end)) || (endDate2 && (endDate2 < activeYear.start || endDate2 > activeYear.end)))) {
            toast.error(`Rentang ekspor harus dalam tahun ajaran aktif ${activeYear.tahun_awal}/${activeYear.tahun_akhir}.`);
            return;
        }

        const params = new URLSearchParams();
        params.set('type', 'guru');
        guruIds2.forEach(id => params.append('guru_ids[]', id));
        if (startDate2) params.set('start_date', startDate2);
        if (endDate2) params.set('end_date', endDate2);

        setExporting2(true);
        try {
            const response = await fetch(`${window.location.origin}/guru/export/download?${params.toString()}`, {
                headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/html, */*' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const text = await response.text();
                toast.error('Gagal mengunduh file ekspor.');
                return;
            }

            const blob = await response.blob();
            if (blob.size < 100) {
                toast.error('Data kosong untuk filter ini.');
                return;
            }

            const disposition = response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
            const filename = filenameMatch ? filenameMatch[1] : 'rekap-presensi-guru.xlsx';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success('File ekspor berhasil diunduh.');
        } catch {
            toast.error('Terjadi kesalahan saat ekspor.');
        } finally {
            setExporting2(false);
        }
    };

    return (
        <>
            <Head title="Ekspor Presensi" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Ekspor Presensi
                        </h1>
                        <p className="text-sm text-foreground mt-1">
                            Ekspor data presensi dalam format Excel.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Form 1: Ekspor Presensi Kelas (Siswa) */}
                    <div className="col-span-1 flex flex-col gap-6">
                        <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border min-h-[400px] flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Ekspor Presensi Kelas (Siswa)
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Filter: Kelas, Tanggal Mulai, Tanggal Selesai
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Pilih Kelas</label>
                                    <div ref={kelasRef1[0]} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setKelasOpen1(!kelasOpen1);
                                            }}
                                            className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-muted/30 px-3 py-1 text-xs leading-tight shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:w-[220px] sm:text-sm"
                                        >
                                            <span className="min-w-0 flex-1 truncate text-left text-xs leading-tight sm:text-sm">
                                                {kelasIds1.length === 0
                                                    ? 'Pilih Kelas'
                                                    : allKelasSelected1
                                                        ? 'Semua Kelas'
                                                        : `${kelasIds1.length} kelas dipilih`}
                                            </span>
                                            <ChevronDown className="size-4 shrink-0 opacity-50" />
                                        </button>
                                        {kelasOpen1 && (
                                            <div className="bg-popover text-popover-foreground absolute z-[100] mt-1 w-full origin-top overflow-hidden rounded-md border shadow-md sm:w-[220px]">
                                                <div className="flex items-center gap-2 border-b px-3 py-2">
                                                    <Search className="size-4 shrink-0 opacity-50" />
                                                    <input
                                                        value={kelasSearch1}
                                                        onChange={(e) => setKelasSearch1(e.target.value)}
                                                        placeholder="Cari kelas..."
                                                        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:text-sm"
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto p-1">
                                                    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={allKelasSelected1}
                                                            onChange={toggleAllKelas1}
                                                            className="size-4 shrink-0"
                                                        />
                                                        <span className="font-medium">Semua Kelas</span>
                                                    </label>
                                                    {filteredKelas1.length === 0 ? (
                                                        <p className="px-2 py-6 text-center text-xs text-muted-foreground sm:text-sm">
                                                            Tidak ada hasil
                                                        </p>
                                                    ) : (
                                                        filteredKelas1.map((k) => (
                                                            <label key={k.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={kelasIds1.includes(k.id.toString())}
                                                                    onChange={() => toggleKelas1(k.id.toString())}
                                                                    className="size-4 shrink-0"
                                                                />
                                                                <span className="flex-1 break-words whitespace-normal leading-snug">{k.full_nama_kelas ?? k.nama_kelas}</span>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Tanggal Mulai</label>
                                        <Input
                                            type="date"
                                            value={startDate1}
                                            onChange={(e) => setStartDate1(e.target.value)}
                                            className="w-[170px] bg-muted/30 h-9"
                                            min={activeYear?.start}
                                            max={activeYear?.end}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Tanggal Selesai</label>
                                        <Input
                                            type="date"
                                            value={endDate1}
                                            onChange={(e) => setEndDate1(e.target.value)}
                                            className="w-[170px] bg-muted/30 h-9"
                                            min={activeYear?.start}
                                            max={activeYear?.end}
                                        />
                                    </div>

                                    <Button
                                        onClick={handleExport1}
                                        disabled={exporting1 || kelasIds1.length === 0}
                                        className="w-full py-3 gap-2"
                                    >
                                        {exporting1 ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Ekspor Presensi Siswa
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Form 2: Ekspor Rekap Presensi Guru */}
                        <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border min-h-[400px] flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Ekspor Rekap Presensi Guru
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Filter: Guru, Tanggal Mulai, Tanggal Selesai
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Pilih Guru</label>
                                    <div ref={guruRef2[0]} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setGuruOpen2(!guruOpen2);
                                            }}
                                            className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-muted/30 px-3 py-1 text-xs leading-tight shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:w-[220px] sm:text-sm"
                                        >
                                            <span className="min-w-0 flex-1 truncate text-left text-xs leading-tight sm:text-sm">
                                                {guruIds2.length === 0
                                                    ? 'Pilih Guru'
                                                    : allGuruSelected2
                                                        ? 'Semua Guru'
                                                        : `${guruIds2.length} guru dipilih`}
                                            </span>
                                            <ChevronDown className="size-4 shrink-0 opacity-50" />
                                        </button>
                                        {guruOpen2 && (
                                            <div className="bg-popover text-popover-foreground absolute z-[100] mt-1 w-full origin-top overflow-hidden rounded-md border shadow-md sm:w-[220px]">
                                                <div className="flex items-center gap-2 border-b px-3 py-2">
                                                    <Search className="size-4 shrink-0 opacity-50" />
                                                    <input
                                                        value={guruSearch2}
                                                        onChange={(e) => setGuruSearch2(e.target.value)}
                                                        placeholder="Cari guru..."
                                                        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:text-sm"
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto p-1">
                                                    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={allGuruSelected2}
                                                            onChange={toggleAllGuru2}
                                                            className="size-4 shrink-0"
                                                        />
                                                        <span className="font-medium">Semua Guru</span>
                                                    </label>
                                                    {filteredGurus2.length === 0 ? (
                                                        <p className="px-2 py-6 text-center text-xs text-muted-foreground sm:text-sm">
                                                            Tidak ada hasil
                                                        </p>
                                                    ) : (
                                                        filteredGurus2.map(g => (
                                                            <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={guruIds2.includes(g.id.toString())}
                                                                    onChange={() => toggleGuru2(g.id.toString())}
                                                                    className="size-4 shrink-0"
                                                                />
                                                                <span className="flex-1 break-words whitespace-normal leading-snug">
                                                                    {g.guru?.nama}
                                                                </span>
                                                            </label>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Tanggal Mulai</label>
                                        <Input
                                            type="date"
                                            value={startDate2}
                                            onChange={(e) => setStartDate2(e.target.value)}
                                            className="w-[170px] bg-muted/30 h-9"
                                            min={activeYear?.start}
                                            max={activeYear?.end}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Tanggal Selesai</label>
                                        <Input
                                            type="date"
                                            value={endDate2}
                                            onChange={(e) => setEndDate2(e.target.value)}
                                            className="w-[170px] bg-muted/30 h-9"
                                            min={activeYear?.start}
                                            max={activeYear?.end}
                                        />
                                    </div>

                                    <Button
                                        onClick={handleExport2}
                                        disabled={exporting2 || guruIds2.length === 0}
                                        className="w-full py-3 gap-2"
                                    >
                                        {exporting2 ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Ekspor Presensi Guru
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
