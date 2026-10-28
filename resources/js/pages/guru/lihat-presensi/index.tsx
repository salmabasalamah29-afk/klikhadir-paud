import { Head, router } from '@inertiajs/react';
import {
    Calendar,
    CheckCircle,
    Clock,
    FileWarning,
    GraduationCap,
    Info,
    UserCircle,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import DateInput, { formatTanggalLengkap } from '@/components/date-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/ui/searchable-select';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import guruLihatPresensi from '@/routes/guru/lihat-presensi';

interface Kelas {
    id: number;
    nama_kelas: string | null;
    full_nama_kelas: string;
}

type StatusKehadiran = 'hadir' | 'sakit' | 'izin';

interface Siswa {
    id: number;
    nisn: string;
    nama: string;
    foto_url?: string | null;
    absensi: {
        id: number | null;
        status: StatusKehadiran;
        keterangan: string | null;
        guru_nama: string | null;
        created_at: string | null;
        updated_at: string | null;
    } | null;
}

interface Props {
    kelasList: Kelas[];
    filters: {
        kelas_id: string | null;
        tanggal: string;
    };
    siswas: Siswa[];
    activeYear?: { tahun_awal: string; tahun_akhir: string; start: string; end: string } | null;
    isOutOfYear?: boolean;
}

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'hadir':
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <CheckCircle className="h-3 w-3" /> Hadir
                </span>
            );
        case 'sakit':
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    <Clock className="h-3 w-3" /> Sakit
                </span>
            );
        case 'izin':
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                    <FileWarning className="h-3 w-3" /> Izin
                </span>
            );
        default:
            return <span className="text-xs text-muted-foreground">-</span>;
    }
};

const formatJam = (iso: string | null): string => {
    if (!iso) {
        return '-';
    }

    try {
        const date = new Date(iso);
        const time = date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta',
        });

        return time.replace(/:/g, '.');
    } catch {
        return '-';
    }
};

export default function GuruLihatPresensiIndex({
    kelasList,
    filters,
    siswas = [],
    activeYear,
    isOutOfYear,
}: Props) {
    const [berhalanganOnly, setBerhalanganOnly] = useState(false);

    useAutoRefresh(Boolean(filters.kelas_id), 5000, ['siswas']);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        const newFilters = { ...filters, [key]: value };

        router.get(guruLihatPresensi.index.url(), newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const stats = {
        hadir: siswas.filter((s) => s.absensi?.status === 'hadir').length,
        sakit: siswas.filter((s) => s.absensi?.status === 'sakit').length,
        izin: siswas.filter((s) => s.absensi?.status === 'izin').length,
    };

    const berhalanganSiswas = siswas.filter(
        (s) => s.absensi && s.absensi.status !== 'hadir',
    );

    const shownSiswas = berhalanganOnly ? berhalanganSiswas : siswas;

    const namaKelas =
        kelasList.find((k) => k.id.toString() === filters.kelas_id)
            ?.full_nama_kelas ?? '-';

    const terbaru = siswas
        .filter((s) => s.absensi)
        .map((s) => s.absensi!)
        .sort(
            (a, b) =>
                new Date(b.updated_at ?? b.created_at ?? 0).getTime() -
                new Date(a.updated_at ?? a.created_at ?? 0).getTime(),
        )[0];

    const totalSiswa = siswas.length;

    return (
        <>
            <Head title="Lihat Presensi" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Lihat Presensi Siswa
                    </h1>
                    <p className="text-muted-foreground">
                        Menampilkan riwayat presensi siswa per kelas dan tanggal.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
                    <aside className="self-start rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border lg:sticky lg:top-8">
                        <div className="mb-4">
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                <Calendar className="h-4 w-4 text-primary" />{' '}
                                Filter Data
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Pilih kelas dan tanggal untuk melihat presensi.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Kelas
                                </label>
                                <SearchableSelect
                                    value={filters.kelas_id || ''}
                                    onValueChange={(val) =>
                                        handleFilterChange('kelas_id', val)
                                    }
                                    placeholder="Pilih Kelas..."
                                    items={kelasList.map((k) => ({
                                        value: k.id.toString(),
                                        label: k.full_nama_kelas,
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Tanggal
                                </label>
                                <DateInput
                                    value={filters.tanggal}
                                    min={activeYear?.start}
                                    max={activeYear?.end}
                                    onChange={(iso) =>
                                        handleFilterChange('tanggal', iso)
                                    }
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="berhalangan"
                                    checked={berhalanganOnly}
                                    onCheckedChange={(checked) =>
                                        setBerhalanganOnly(checked === true)
                                    }
                                />
                                <Label
                                    htmlFor="berhalangan"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    Berhalangan Hadir
                                </Label>
                            </div>

                            {isOutOfYear && (
                                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                    Tanggal berada di luar tahun ajaran aktif.
                                </p>
                            )}
                        </div>
                    </aside>

                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Hadir
                                </p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {stats.hadir}
                                </p>
                            </div>
                            <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Sakit
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {stats.sakit}
                                </p>
                            </div>
                            <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
                                <p className="text-xs text-muted-foreground">
                                    Izin
                                </p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {stats.izin}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/15 px-6 py-3 text-sm font-medium whitespace-nowrap text-white backdrop-blur-md">
                                <Calendar className="h-5 w-5" />
                                {formatTanggalLengkap(filters.tanggal)}
                            </span>
                            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/15 px-6 py-3 text-sm font-medium whitespace-nowrap text-white backdrop-blur-md">
                                <GraduationCap className="h-5 w-5" />
                                {namaKelas}
                            </span>
                            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/30 bg-white/15 px-6 py-3 text-sm font-medium whitespace-nowrap text-white backdrop-blur-md">
                                <Users className="h-5 w-5" />
                                {totalSiswa} Siswa
                            </span>
                        </div>

                        <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border">
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Info className="h-4 w-4 text-primary" />{' '}
                                Keterangan Guru dan Waktu Pembaruan
                            </h3>
                            {terbaru ? (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    oleh:{' '}
                                    <span className="font-semibold text-foreground">
                                        {terbaru.guru_nama ?? '-'}
                                    </span>
                                    , pukul{' '}
                                    <span className="font-semibold text-foreground">
                                        {formatJam(
                                            terbaru.updated_at ??
                                                terbaru.created_at,
                                        )}
                                    </span>
                                </p>
                            ) : (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Belum ada pembaruan untuk kelas ini.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border">
                    <div className="border-b border-sidebar-border/70 p-6 dark:border-sidebar-border">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <UserCircle className="h-4 w-4 text-muted-foreground" />{' '}
                            Data Presensi
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {berhalanganOnly
                                ? 'Menampilkan siswa berhalangan hadir saja'
                                : 'Data kehadiran siswa per tanggal'}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="w-12 px-3 py-3 text-center">
                                        No
                                    </th>
                                    <th className="w-[92px] px-2 py-3 text-center whitespace-nowrap">
                                        NISN
                                    </th>
                                    <th className="min-w-[180px] px-6 py-4">
                                        Nama Siswa
                                    </th>
                                    <th className="min-w-[140px] px-6 py-4">
                                        Status
                                    </th>
                                    <th className="min-w-[220px] px-6 py-4">
                                        Keterangan
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                {shownSiswas.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-12 text-center text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <UserCircle className="h-8 w-8 opacity-20" />
                                                <p>
                                                    Tidak ada data presensi untuk
                                                    filter ini.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    shownSiswas.map((siswa, index) => (
                                        <tr
                                            key={siswa.id}
                                            className="hover:bg-muted/30"
                                        >
                                            <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                                                {index + 1}
                                            </td>
                                            <td className="px-2 py-3 text-center font-mono text-[11px] font-medium tracking-tight whitespace-nowrap">
                                                {siswa.nisn}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-foreground">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-sidebar-border/50">
                                                        <AvatarImage
                                                            src={
                                                                siswa.foto_url ??
                                                                undefined
                                                            }
                                                            alt={siswa.nama}
                                                        />
                                                        <AvatarFallback className="bg-neutral-100 text-xs font-semibold text-neutral-600">
                                                            {siswa.nama
                                                                .slice(0, 2)
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{siswa.nama}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {siswa.absensi ? (
                                                    <StatusBadge
                                                        status={
                                                            siswa.absensi.status
                                                        }
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                className="max-w-[260px] truncate px-6 py-4 text-sm text-muted-foreground"
                                                title={
                                                    siswa.absensi?.keterangan ||
                                                    ''
                                                }
                                            >
                                                {siswa.absensi?.keterangan || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
