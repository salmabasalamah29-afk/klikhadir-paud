import { Head, router } from '@inertiajs/react';
import {
    Shield,
    ShieldCheck,
    Users,
    GraduationCap,
    Activity,
    PieChart as PieChartIcon,
    FileSpreadsheet,
    ChevronDown,
    Loader2,
    Search,
} from 'lucide-react';
import { useState, useRef } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard } from '@/routes/admin';

interface Stats {
    total_admin: number;
    total_siswa: number;
    total_guru: number;
    total_kelas: number;
}

interface Kelas {
    id: number;
    nama_kelas: string;
    full_nama_kelas?: string;
}

interface GuruExport {
    id: number;
    nama: string;
    kelasList: KelasItem[];
}

interface DetailedAttendance {
    id: number;
    jam_ke: string;
    status: string;
    keterangan: string | null;
    bukti: string | null;
    siswa: {
        nis: string;
        nama: string;
    };
    kelas: string;
    guru: string;
}

interface KelasItem {
    id: number;
    nama_kelas: string;
    full_nama_kelas?: string;
}

interface AdminDashboardProps {
    stats: Stats;
    attendanceToday: {
        hadir: number;
        sakit: number;
        izin: number;
        kelas: number;
    };
    studentsPerKelas: {
        id: number;
        nama_kelas: string;
        count: number;
    }[];
    filters: {
        tanggal: string;
    };
    detailedAttendance: DetailedAttendance[];
    gurus: GuruExport[];
    kelasList: Kelas[];
    activeYear?: {
        tahun_awal: string;
        tahun_akhir: string;
        start: string;
        end: string;
    } | null;
    isOutOfYear?: boolean;
}

const attendanceConfig = {
    hadir: { label: 'Hadir', color: 'var(--chart-2)' },
    sakit: { label: 'Sakit', color: 'var(--chart-4)' },
    izin: { label: 'Izin', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const kelasConfig = {
    count: { label: 'Jumlah Siswa', color: 'var(--chart-3)' },
} satisfies ChartConfig;

export default function AdminDashboard({
    stats,
    attendanceToday,
    studentsPerKelas = [],
    filters,
    gurus = [],
    kelasList = [],
    activeYear = null,
    isOutOfYear = false,
}: AdminDashboardProps) {
    const attendanceData = [
        {
            status: 'hadir',
            count: attendanceToday.hadir,
            fill: 'var(--color-hadir)',
        },
        {
            status: 'sakit',
            count: attendanceToday.sakit,
            fill: 'var(--color-sakit)',
        },
        {
            status: 'izin',
            count: attendanceToday.izin,
            fill: 'var(--color-izin)',
        },
    ];
    const gridData = [
        ...attendanceData,
        {
            status: 'kelas',
            count: attendanceToday.kelas,
            fill: 'var(--color-kelas)',
        },
    ];
    useAutoRefresh(!isOutOfYear, 5000);

    // Export Form 1: Presensi Kelas (Siswa)
    const [kelasIds1, setKelasIds1] = useState<string[]>([]);
    const [startDate1, setStartDate1] = useState('');
    const [endDate1, setEndDate1] = useState('');
    const [kelasSearch1, setKelasSearch1] = useState('');
    const [kelasOpen1, setKelasOpen1] = useState(false);
    const [exporting1, setExporting1] = useState(false);
    const kelasRef1 = useRef<HTMLDivElement>(null);

    // Export Form 2: Rekap Presensi Guru
    const [guruIds2, setGuruIds2] = useState<string[]>([]);
    const [startDate2, setStartDate2] = useState('');
    const [endDate2, setEndDate2] = useState('');
    const [guruSearch2, setGuruSearch2] = useState('');
    const [guruOpen2, setGuruOpen2] = useState(false);
    const [exporting2, setExporting2] = useState(false);
    const guruRef2 = useRef<HTMLDivElement>(null);

    const allKelasSelected1 =
        kelasIds1.length === kelasList.length && kelasList.length > 0;
    const allGuruSelected2 =
        guruIds2.length === gurus.length && gurus.length > 0;

    const filteredKelas1 = kelasList.filter((k) =>
        (k.full_nama_kelas ?? k.nama_kelas)
            .toLowerCase()
            .includes(kelasSearch1.toLowerCase()),
    );

    const filteredGurus2 = gurus.filter((g) =>
        g.nama.toLowerCase().includes(guruSearch2.toLowerCase()),
    );

    const toggleKelas1 = (id: string) => {
        setKelasIds1((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
        setKelasOpen1(false);
    };

    const toggleAllKelas1 = () => {
        if (allKelasSelected1) {
            setKelasIds1([]);
        } else {
            setKelasIds1(kelasList.map((k) => k.id.toString()));
        }

        setKelasOpen1(false);
    };

    const toggleGuru2 = (id: string) => {
        setGuruIds2((prev) =>
            prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
        );
        setGuruOpen2(false);
    };

    const toggleAllGuru2 = () => {
        if (allGuruSelected2) {
            setGuruIds2([]);
        } else {
            setGuruIds2(gurus.map((g) => g.id.toString()));
        }

        setGuruOpen2(false);
    };

    const handleExport1 = async () => {
        if (kelasIds1.length === 0) {
            toast.error('Silakan pilih Kelas untuk ekspor.');

            return;
        }

        if (
            activeYear &&
            ((startDate1 &&
                (startDate1 < activeYear.start ||
                    startDate1 > activeYear.end)) ||
                (endDate1 &&
                    (endDate1 < activeYear.start || endDate1 > activeYear.end)))
        ) {
            toast.error(
                `Rentang ekspor harus dalam tahun ajaran aktif ${activeYear.tahun_awal}/${activeYear.tahun_akhir}.`,
            );

            return;
        }

        const params = new URLSearchParams();
        params.set('type', 'kelas');
        kelasIds1.forEach((id) => params.append('kelas_ids[]', id));

        if (startDate1) {
            params.set('start_date', startDate1);
        }

        if (endDate1) {
            params.set('end_date', endDate1);
        }

        setExporting1(true);

        try {
            const response = await fetch(
                `${window.location.origin}/guru/export/download?${params.toString()}`,
                {
                    headers: {
                        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/html, */*',
                    },
                    credentials: 'same-origin',
                },
            );

            if (!response.ok) {
                await response.text();
                toast.error('Gagal mengunduh file ekspor.');

                return;
            }

            const blob = await response.blob();

            if (blob.size < 100) {
                toast.error('Data kosong untuk filter ini.');

                return;
            }

            const disposition =
                response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
            const filename = filenameMatch
                ? filenameMatch[1]
                : 'rekap-presensi-kelas.xlsx';
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

        if (
            activeYear &&
            ((startDate2 &&
                (startDate2 < activeYear.start ||
                    startDate2 > activeYear.end)) ||
                (endDate2 &&
                    (endDate2 < activeYear.start || endDate2 > activeYear.end)))
        ) {
            toast.error(
                `Rentang ekspor harus dalam tahun ajaran aktif ${activeYear.tahun_awal}/${activeYear.tahun_akhir}.`,
            );

            return;
        }

        const params = new URLSearchParams();
        params.set('type', 'guru');
        guruIds2.forEach((id) => params.append('guru_ids[]', id));

        if (startDate2) {
            params.set('start_date', startDate2);
        }

        if (endDate2) {
            params.set('end_date', endDate2);
        }

        setExporting2(true);

        try {
            const response = await fetch(
                `${window.location.origin}/guru/export/download?${params.toString()}`,
                {
                    headers: {
                        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/html, */*',
                    },
                    credentials: 'same-origin',
                },
            );

            if (!response.ok) {
                await response.text();
                toast.error('Gagal mengunduh file ekspor.');

                return;
            }

            const blob = await response.blob();

            if (blob.size < 100) {
                toast.error('Data kosong untuk filter ini.');

                return;
            }

            const disposition =
                response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
            const filename = filenameMatch
                ? filenameMatch[1]
                : 'rekap-presensi-guru.xlsx';
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

    const [statDate, setStatDate] = useState(filters.tanggal);

    const handleStatDateChange = (newDate: string) => {
        setStatDate(newDate);
        router.get(
            adminDashboard.url(),
            { tanggal: newDate },
            { preserveState: true, preserveScroll: true },
        );
    };

    const openStatistik = (status: string) => {
        router.get(
            `/admin/statistik/${status}`,
            { tanggal: statDate },
            { preserveState: false },
        );
    };

    return (
        <>
            <Head title="Admin Dasbor" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Pusat Kendali Admin
                    </h1>
                    <p className="text-muted-foreground">
                        Kelola data master sistem presensi Klikhadir.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Kartu 1: Total Siswa */}
                    <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border">
                        <div className="rounded-full bg-orange-100 p-2.5 dark:bg-orange-900/30">
                            <GraduationCap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Siswa
                            </p>
                            <h3 className="text-xl font-bold">
                                {stats.total_siswa}
                            </h3>
                        </div>
                    </div>

                    {/* Kartu 2: Total Kelas */}
                    <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border">
                        <div className="rounded-full bg-purple-100 p-2.5 dark:bg-purple-900/30">
                            <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Kelas
                            </p>
                            <h3 className="text-xl font-bold">
                                {stats.total_kelas}
                            </h3>
                        </div>
                    </div>

                    {/* Kartu 3: Total Guru */}
                    <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border">
                        <div className="rounded-full bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Guru
                            </p>
                            <h3 className="text-xl font-bold">
                                {stats.total_guru}
                            </h3>
                        </div>
                    </div>

                    {/* Kartu 4: Total Admin */}
                    <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border">
                        <div className="rounded-full bg-slate-100 p-2.5 dark:bg-slate-800">
                            <ShieldCheck className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Admin
                            </p>
                            <h3 className="text-xl font-bold">
                                {stats.total_admin}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Export Section */}
                <div className="flex flex-col gap-4">
                    {/* Form 1: Ekspor Presensi Kelas */}
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border">
                        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />{' '}
                            Ekspor Presensi Kelas
                        </h2>

                        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Pilih Kelas
                                </label>
                                <div
                                    ref={kelasRef1}
                                    className="relative w-full md:w-[220px]"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setKelasOpen1(!kelasOpen1)
                                        }
                                        className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-muted/30 px-3 py-1 text-xs leading-tight shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
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
                                        <div className="absolute z-[100] mt-1 w-full origin-top overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                                            <div className="flex items-center gap-2 border-b px-3 py-2">
                                                <Search className="size-4 shrink-0 opacity-50" />
                                                <input
                                                    value={kelasSearch1}
                                                    onChange={(e) =>
                                                        setKelasSearch1(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Cari kelas..."
                                                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:text-sm"
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto p-1">
                                                <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            allKelasSelected1
                                                        }
                                                        onChange={
                                                            toggleAllKelas1
                                                        }
                                                        className="size-4 shrink-0"
                                                    />
                                                    <span className="font-medium">
                                                        Semua Kelas
                                                    </span>
                                                </label>
                                                {filteredKelas1.length === 0 ? (
                                                    <p className="px-2 py-6 text-center text-xs text-muted-foreground sm:text-sm">
                                                        Tidak ada hasil
                                                    </p>
                                                ) : (
                                                    filteredKelas1.map((k) => (
                                                        <label
                                                            key={k.id}
                                                            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={kelasIds1.includes(
                                                                    k.id.toString(),
                                                                )}
                                                                onChange={() =>
                                                                    toggleKelas1(
                                                                        k.id.toString(),
                                                                    )
                                                                }
                                                                className="size-4 shrink-0"
                                                            />
                                                            <span className="flex-1 leading-snug break-words whitespace-normal">
                                                                {k.full_nama_kelas ??
                                                                    k.nama_kelas}
                                                            </span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Tanggal Mulai
                                </label>
                                <Input
                                    type="date"
                                    value={startDate1}
                                    onChange={(e) =>
                                        setStartDate1(e.target.value)
                                    }
                                    className="h-9 w-full bg-muted/30 md:w-[170px]"
                                    min={activeYear?.start}
                                    max={activeYear?.end}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Tanggal Selesai
                                </label>
                                <Input
                                    type="date"
                                    value={endDate1}
                                    onChange={(e) =>
                                        setEndDate1(e.target.value)
                                    }
                                    className="h-9 w-full bg-muted/30 md:w-[170px]"
                                    min={activeYear?.start}
                                    max={activeYear?.end}
                                />
                            </div>

                            <Button
                                onClick={handleExport1}
                                disabled={exporting1 || kelasIds1.length === 0}
                                className="h-9 gap-2 px-6"
                            >
                                {exporting1 ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Ekspor
                            </Button>
                        </div>
                    </div>

                    {/* Form 2: Ekspor Presensi Guru */}
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border">
                        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                            <FileSpreadsheet className="h-4 w-4 text-blue-600" />{' '}
                            Ekspor Presensi Guru
                        </h2>

                        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Pilih Guru
                                </label>
                                <div
                                    ref={guruRef2}
                                    className="relative w-full md:w-[220px]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setGuruOpen2(!guruOpen2)}
                                        className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-muted/30 px-3 py-1 text-xs leading-tight shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
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
                                        <div className="absolute z-[100] mt-1 w-full origin-top overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                                            <div className="flex items-center gap-2 border-b px-3 py-2">
                                                <Search className="size-4 shrink-0 opacity-50" />
                                                <input
                                                    value={guruSearch2}
                                                    onChange={(e) =>
                                                        setGuruSearch2(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Cari guru..."
                                                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:text-sm"
                                                />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto p-1">
                                                <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            allGuruSelected2
                                                        }
                                                        onChange={
                                                            toggleAllGuru2
                                                        }
                                                        className="size-4 shrink-0"
                                                    />
                                                    <span className="font-medium">
                                                        Semua Guru
                                                    </span>
                                                </label>
                                                {filteredGurus2.length === 0 ? (
                                                    <p className="px-2 py-6 text-center text-xs text-muted-foreground sm:text-sm">
                                                        Tidak ada hasil
                                                    </p>
                                                ) : (
                                                    filteredGurus2.map((g) => (
                                                        <label
                                                            key={g.id}
                                                            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent sm:text-sm"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={guruIds2.includes(
                                                                    g.id.toString(),
                                                                )}
                                                                onChange={() =>
                                                                    toggleGuru2(
                                                                        g.id.toString(),
                                                                    )
                                                                }
                                                                className="size-4 shrink-0"
                                                            />
                                                            <span className="flex-1 leading-snug break-words whitespace-normal">
                                                                {g.nama}
                                                            </span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Tanggal Mulai
                                </label>
                                <Input
                                    type="date"
                                    value={startDate2}
                                    onChange={(e) =>
                                        setStartDate2(e.target.value)
                                    }
                                    className="h-9 w-full bg-muted/30 md:w-[170px]"
                                    min={activeYear?.start}
                                    max={activeYear?.end}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Tanggal Selesai
                                </label>
                                <Input
                                    type="date"
                                    value={endDate2}
                                    onChange={(e) =>
                                        setEndDate2(e.target.value)
                                    }
                                    className="h-9 w-full bg-muted/30 md:w-[170px]"
                                    min={activeYear?.start}
                                    max={activeYear?.end}
                                />
                            </div>

                            <Button
                                onClick={handleExport2}
                                disabled={exporting2 || guruIds2.length === 0}
                                className="h-9 gap-2 px-6"
                            >
                                {exporting2 ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Ekspor
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Attendance Chart + Distribusi Siswa per Kelas */}
                <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Attendance Chart */}
                    <Card className="flex flex-col border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                        <CardHeader className="flex flex-row items-center gap-2 pb-2">
                            <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <CardTitle className="text-lg">
                                    Statistik Presensi
                                </CardTitle>
                                <CardDescription>
                                    Klik status untuk melihat detail siswa
                                </CardDescription>
                            </div>
                            <Input
                                type="date"
                                value={statDate}
                                onChange={(e) =>
                                    handleStatDateChange(e.target.value)
                                }
                                className="h-8 w-[170px] text-xs"
                            />
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col">
                            {attendanceData.reduce(
                                (sum, item) => sum + item.count,
                                0,
                            ) > 0 ? (
                                <>
                                    <ChartContainer
                                        config={attendanceConfig}
                                        className="mx-auto mb-2 aspect-square max-h-[220px]"
                                    >
                                        <PieChart>
                                            <ChartTooltip
                                                cursor={false}
                                                content={
                                                    <ChartTooltipContent
                                                        hideLabel
                                                    />
                                                }
                                            />
                                            <Pie
                                                data={attendanceData}
                                                dataKey="count"
                                                nameKey="status"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                strokeWidth={2}
                                            >
                                                {attendanceData.map(
                                                    (entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={entry.fill}
                                                        />
                                                    ),
                                                )}
                                            </Pie>
                                        </PieChart>
                                    </ChartContainer>
                                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-center">
                                        {gridData.map((item) => (
                                            <button
                                                key={item.status}
                                                className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border border-gray-200 p-1.5 shadow-sm transition-all hover:shadow-md dark:border-gray-700"
                                                onClick={() =>
                                                    openStatistik(item.status)
                                                }
                                                title={`Klik buka halaman ${item.status} — terbaru per siswa`}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    <div
                                                        className="h-2 w-2 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                item.status ===
                                                                'hadir'
                                                                    ? 'var(--chart-2)'
                                                                    : item.status ===
                                                                        'sakit'
                                                                      ? 'var(--chart-4)'
                                                                      : item.status ===
                                                                          'izin'
                                                                        ? 'var(--chart-1)'
                                                                        : 'var(--chart-3)',
                                                        }}
                                                    />
                                                    <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <span className="text-base font-bold">
                                                    {item.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
                                    <PieChartIcon className="mb-3 h-12 w-12 opacity-20" />
                                    <p>
                                        Belum ada data presensi pada tanggal
                                        ini.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Distribusi Siswa per Kelas */}
                    <Card className="flex flex-col border-sidebar-border/70 shadow-sm dark:border-sidebar-border">
                        <CardHeader className="flex flex-row items-center gap-2 pb-2">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <CardTitle className="text-lg">
                                    Distribusi Siswa per Kelas
                                </CardTitle>
                                <CardDescription>
                                    Jumlah siswa per kelas
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            {studentsPerKelas.length > 0 ? (
                                <ChartContainer
                                    config={kelasConfig}
                                    className="mt-2 h-[240px] w-full"
                                >
                                    <BarChart
                                        data={studentsPerKelas}
                                        margin={{
                                            top: 10,
                                            right: 10,
                                            left: -20,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            vertical={false}
                                            strokeDasharray="3 3"
                                        />
                                        <XAxis
                                            dataKey="nama_kelas"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            fontSize={12}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            fontSize={12}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent />}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="var(--chart-3)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex h-[240px] flex-col items-center justify-center text-muted-foreground">
                                    <PieChartIcon className="mb-3 h-12 w-12 opacity-20" />
                                    <p>
                                        Belum ada data distribusi siswa per
                                        kelas
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
