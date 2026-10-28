import { Head, router, Link } from '@inertiajs/react';
import {
    Calendar,
    ArrowLeft,
    Users,
    GraduationCap,
    Search,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import DateInput, { formatTanggalLengkap } from '@/components/date-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard, statistik } from '@/routes/admin';

interface RecordItem {
    id: number;
    tanggal: string;
    status: string;
    keterangan: string | null;
    updated_at?: string;
    siswa: {
        id: number;
        nisn: string | null;
        nama: string;
        foto_url?: string | null;
    } | null;
    kelas: { id: number; nama_kelas: string; full_nama_kelas: string } | null;
    guru: { id: number; nama: string } | null;
}

interface KelasRecord {
    id: number;
    nama_kelas: string;
    full_nama_kelas: string;
    total_siswa: number;
    hadir: number;
    sakit: number;
    izin: number;
    guru: { id: number; nama: string } | null;
    updated_at: string | null;
}

interface Props {
    tanggal: string;
    status: string;
    records: RecordItem[] | KelasRecord[];
    total: number;
    totalKelas?: number;
    kelasSudahAbsen: number;
    isKelas: boolean;
    activeYear?: {
        tahun_awal: string;
        tahun_akhir: string;
        start: string;
        end: string;
    } | null;
    isOutOfYear?: boolean;
}

const kelasPalette = [
    'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300',
    'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300',
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300',
    'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-300',
    'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-900/20 dark:text-pink-300',
    'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300',
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300',
    'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/20 dark:text-teal-300',
];

export default function StatistikIndex({
    tanggal,
    status,
    records,
    total,
    kelasSudahAbsen,
    isKelas,
    activeYear = null,
    isOutOfYear = false,
}: Props) {
    const [filterTanggal, setFilterTanggal] = useState(tanggal);
    const [searchQuery, setSearchQuery] = useState('');

    // Auto-refresh tiap 5 detik agar jam update & data terbaru sinkron dengan guru
    useAutoRefresh(!isOutOfYear, 5000, ['records', 'total', 'kelasSudahAbsen']);

    const getStatusBadge = (s: string) => {
        switch (s) {
            case 'hadir':
                return (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">
                        Hadir
                    </Badge>
                );
            case 'sakit':
                return (
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                        Sakit
                    </Badge>
                );
            case 'izin':
                return (
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                        Izin
                    </Badge>
                );
            case 'kelas':
                return (
                    <Badge className="bg-violet-500 hover:bg-violet-600">
                        Kelas
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{s}</Badge>;
        }
    };

    const handleTanggalChange = (newDate: string) => {
        setFilterTanggal(newDate);
        router.get(
            statistik.url({ status }, { query: { tanggal: newDate } }),
            {},
            { preserveState: false, preserveScroll: true },
        );
    };

    const isKelasView = isKelas;
    const kelasRecordsRaw = useMemo(
        () => (isKelasView ? (records as KelasRecord[]) : []),
        [isKelasView, records],
    );
    const rawSiswaRecords = useMemo(
        () => (!isKelasView ? (records as RecordItem[]) : []),
        [isKelasView, records],
    );
    // Kelompokkan per kelas, lalu urutkan nama siswa A-Z di dalam kelas
    const siswaRecordsSorted = useMemo(
        () =>
            [...rawSiswaRecords].sort((a, b) => {
                const kelasA =
                    a.kelas?.nama_kelas ?? a.kelas?.full_nama_kelas ?? '';
                const kelasB =
                    b.kelas?.nama_kelas ?? b.kelas?.full_nama_kelas ?? '';
                const kelasOrder = kelasA.localeCompare(kelasB, 'id', {
                    numeric: true,
                    sensitivity: 'base',
                });

                if (kelasOrder !== 0) {
                    return kelasOrder;
                }

                return (a.siswa?.nama ?? '').localeCompare(
                    b.siswa?.nama ?? '',
                    'id',
                    { numeric: true, sensitivity: 'base' },
                );
            }),
        [rawSiswaRecords],
    );
    const kelasRecordsSorted = useMemo(
        () =>
            [...kelasRecordsRaw].sort((a, b) =>
                a.full_nama_kelas.localeCompare(b.full_nama_kelas, 'id'),
            ),
        [kelasRecordsRaw],
    );

    // Palette warna: tiap kelas berbeda warna
    const kelasColorMap = useMemo(() => {
        const map = new Map<number, string>();
        let idx = 0;

        for (const k of kelasRecordsSorted) {
            if (!map.has(k.id)) {
                map.set(k.id, kelasPalette[idx % kelasPalette.length]);
                idx++;
            }
        }

        return map;
    }, [kelasRecordsSorted]);

    const getKelasBadgeClass = (kelasId?: number | null) => {
        return kelasColorMap.get(kelasId ?? 0) ?? kelasPalette[0];
    };

    // Search filter untuk siswa records (nama, kelas, guru, NISN, status, keterangan)
    const filteredSiswaRecords = useMemo(() => {
        if (!searchQuery.trim()) {
            return siswaRecordsSorted;
        }

        const q = searchQuery.toLowerCase();

        return siswaRecordsSorted.filter((r) => {
            const haystack = [
                r.siswa?.nisn ?? '',
                r.siswa?.nama ?? '',
                r.kelas?.full_nama_kelas ?? '',
                r.kelas?.nama_kelas ?? '',
                r.guru?.nama ?? '',
                r.status ?? '',
                r.keterangan ?? '',
                r.updated_at ?? '',
                r.tanggal ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [siswaRecordsSorted, searchQuery]);

    // Search filter untuk kelas records (nama kelas)
    const filteredKelasRecords = useMemo(() => {
        if (!searchQuery.trim()) {
            return kelasRecordsSorted;
        }

        const q = searchQuery.toLowerCase();

        return kelasRecordsSorted.filter((k) =>
            [k.full_nama_kelas ?? '', k.nama_kelas ?? '']
                .join(' ')
                .toLowerCase()
                .includes(q),
        );
    }, [kelasRecordsSorted, searchQuery]);

    const showKeterangan = !isKelasView && status === 'izin';

    // Samain persis dengan lihat absensi (guru/data.tsx) — waktu update = jam guru terakhir submit (WIB)
    const formatJam = (iso?: string | null) => {
        if (!iso) {
            return '-';
        }

        try {
            const d = new Date(iso.replace(' ', 'T'));

            if (isNaN(d.getTime())) {
                return iso.slice(11, 16) || '-';
            }

            return d
                .toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Jakarta',
                })
                .replace('.', ':');
        } catch {
            return iso.slice(11, 16) || '-';
        }
    };

    return (
        <>
            <Head title={`Statistik ${status} - ${formatTanggalLengkap(tanggal)}`} />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-foreground hover:bg-accent"
                        >
                            <Link
                                href={adminDashboard.url({
                                    query: { tanggal },
                                })}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {isKelasView
                                    ? 'Rekap Presensi Kelas'
                                    : `Siswa ${status.charAt(0).toUpperCase() + status.slice(1)}`}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <DateInput
                            value={filterTanggal}
                            onChange={(iso) =>
                                handleTanggalChange(iso)
                            }
                            className="h-7 w-[160px] border-0 shadow-none focus-within:ring-0"
                            min={activeYear?.start}
                            max={activeYear?.end}
                        />
                    </div>
                </div>

                {/* Ringkasan kecil */}
                {!isKelasView && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Card className="border-sidebar-border/60">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">
                                    Tanggal
                                </p>
                                <p className="text-sm font-bold">
                                    {formatTanggalLengkap(tanggal)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/60">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">
                                    Total {isKelasView ? 'Kelas' : 'Siswa'}
                                </p>
                                <p className="text-sm font-bold">
                                    {total} {isKelasView ? 'kelas' : 'siswa'}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/60">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">
                                    Total Kelas
                                </p>
                                <p className="text-sm font-bold">
                                    {kelasSudahAbsen} kelas
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-sidebar-border/60">
                            <CardContent className="p-3">
                                <p className="text-xs text-muted-foreground">
                                    Status
                                </p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {status.charAt(0).toUpperCase() +
                                        status.slice(1)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {isKelasView ? (
                    <Card>
                        <CardHeader className="space-y-3">
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-violet-600" />{' '}
                                Rekap Presensi Kelas
                            </CardTitle>
                            <div className="relative max-w-sm">
                                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama kelas..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-9 pl-8"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[55px] text-center">
                                                NO
                                            </TableHead>
                                            <TableHead className="min-w-[180px]">
                                                KELAS
                                            </TableHead>
                                            <TableHead className="w-[120px] text-center">
                                                TOTAL SISWA
                                            </TableHead>
                                            <TableHead className="w-[90px] text-center">
                                                HADIR
                                            </TableHead>
                                            <TableHead className="w-[90px] text-center">
                                                SAKIT
                                            </TableHead>
                                            <TableHead className="w-[90px] text-center">
                                                IZIN
                                            </TableHead>
                                            <TableHead className="min-w-[140px]">
                                                GURU
                                            </TableHead>
                                            <TableHead className="w-[150px] text-center">
                                                WAKTU PEMBARUAN
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredKelasRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={8}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    {searchQuery
                                                        ? `Tidak ada kelas yang cocok dengan "${searchQuery}"`
                                                        : isOutOfYear
                                                          ? `Data tanggal ini telah diarsipkan. Lihat menu Arsip untuk tahun ajaran {activeYear?.tahun_awal}/{activeYear?.tahun_akhir}.`
                                                          : 'Belum ada kelas yang diabsen pada tanggal ini.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredKelasRecords.map(
                                                (k, idx) => (
                                                    <TableRow
                                                        key={k.id}
                                                        className="hover:bg-muted/40"
                                                    >
                                                        <TableCell className="text-center text-muted-foreground">
                                                            {idx + 1}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {k.full_nama_kelas}
                                                        </TableCell>
                                                        <TableCell className="text-center font-bold">
                                                            {k.total_siswa}
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium text-emerald-600">
                                                            {k.hadir}
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium text-blue-600">
                                                            {k.sakit}
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium text-orange-600">
                                                            {k.izin}
                                                        </TableCell>
                                                        <TableCell className="text-xs whitespace-nowrap">
                                                            {k.guru?.nama ??
                                                                '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs whitespace-nowrap">
                                                            {formatJam(
                                                                k.updated_at,
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {searchQuery && filteredKelasRecords.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Menampilkan {filteredKelasRecords.length}{' '}
                                    dari {kelasRecordsSorted.length} data
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader className="space-y-3">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />{' '}
                                {`Siswa ${status.charAt(0).toUpperCase() + status.slice(1)}`}
                            </CardTitle>
                            <div className="relative max-w-sm">
                                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari NISN, nama, kelas, guru"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-9 pl-8"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[55px] text-center">
                                                NO
                                            </TableHead>
                                            <TableHead className="w-[120px]">
                                                NISN
                                            </TableHead>
                                            <TableHead className="min-w-[200px]">
                                                NAMA
                                            </TableHead>
                                            <TableHead className="min-w-[150px]">
                                                KELAS
                                            </TableHead>
                                            <TableHead className="w-[110px] text-center">
                                                STATUS
                                            </TableHead>
                                            <TableHead className="min-w-[140px]">
                                                GURU
                                            </TableHead>
                                            {showKeterangan && (
                                                <TableHead className="min-w-[180px]">
                                                    KETERANGAN
                                                </TableHead>
                                            )}
                                            <TableHead className="w-[150px] text-center">
                                                WAKTU PEMBARUAN
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSiswaRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={
                                                        showKeterangan ? 8 : 7
                                                    }
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    {searchQuery
                                                        ? `Tidak ada hasil untuk "${searchQuery}"`
                                                        : isOutOfYear
                                                          ? `Data tanggal ini telah diarsipkan. Lihat menu Arsip untuk tahun ajaran {activeYear?.tahun_awal}/{activeYear?.tahun_akhir}.`
                                                          : `Belum ada siswa dengan status ${status} pada tanggal ini.`}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSiswaRecords.map(
                                                (r, idx) => {
                                                    const kelasBadge =
                                                        getKelasBadgeClass(
                                                            r.kelas?.id,
                                                        );

                                                    return (
                                                        <TableRow
                                                            key={r.id}
                                                            className="hover:bg-muted/40"
                                                        >
                                                            <TableCell className="text-center text-muted-foreground">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs font-medium">
                                                                {r.siswa
                                                                    ?.nisn ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="size-8 shrink-0 overflow-hidden rounded-full">
                                                                        <AvatarImage
                                                                            src={
                                                                                r
                                                                                    .siswa
                                                                                    ?.foto_url ??
                                                                                undefined
                                                                            }
                                                                            alt={
                                                                                r
                                                                                    .siswa
                                                                                    ?.nama ??
                                                                                ''
                                                                            }
                                                                        />
                                                                        <AvatarFallback className="bg-muted text-xs">
                                                                            {r.siswa?.nama
                                                                                ?.slice(
                                                                                    0,
                                                                                    2,
                                                                                )
                                                                                .toUpperCase() ??
                                                                                '-'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span
                                                                        className="max-w-[220px] truncate font-medium whitespace-nowrap"
                                                                        title={
                                                                            r
                                                                                .siswa
                                                                                ?.nama ??
                                                                            ''
                                                                        }
                                                                    >
                                                                        {r.siswa
                                                                            ?.nama ??
                                                                            '-'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span
                                                                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ring-1 ${kelasBadge}`}
                                                                >
                                                                    <GraduationCap className="h-3 w-3 shrink-0" />{' '}
                                                                    <span className="max-w-[120px] truncate">
                                                                        {r.kelas
                                                                            ?.full_nama_kelas ??
                                                                            '-'}
                                                                    </span>
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {getStatusBadge(
                                                                    r.status,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-xs whitespace-nowrap">
                                                                {r.guru?.nama ??
                                                                    '-'}
                                                            </TableCell>
                                                            {showKeterangan && (
                                                                <TableCell
                                                                    className="max-w-[220px] text-xs whitespace-normal"
                                                                    title={
                                                                        r.keterangan ??
                                                                        ''
                                                                    }
                                                                >
                                                                    {r.keterangan ||
                                                                        '-'}
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="text-center font-mono text-xs whitespace-nowrap">
                                                                {formatJam(
                                                                    r.updated_at,
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                },
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {searchQuery && filteredSiswaRecords.length > 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Menampilkan {filteredSiswaRecords.length}{' '}
                                    dari {siswaRecordsSorted.length} data
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

StatistikIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: adminDashboard.url() },
        { title: 'Statistik', href: '#' },
    ],
};
