import { Head, router } from '@inertiajs/react';
import { Calendar, Clock, Info, UserCircle, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import DateInput, { formatTanggalIndo } from '@/components/date-input';
import SearchableSelect from '@/components/ui/searchable-select';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import guruLihatPresensi from '@/routes/guru/lihat-presensi';

interface Kelas {
    id: number;
    nama_kelas: string | null;
    full_nama_kelas: string;
}

interface Siswa {
    id: number;
    nisn: string;
    nama: string;
    foto_url?: string | null;
    absensi: {
        id: number | null;
        status: 'hadir' | 'sakit' | 'izin' | 'alpha' | 'dispensasi';
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

export default function GuruLihatPresensiIndex({
    kelasList,
    filters,
    siswas = [],
    activeYear,
    isOutOfYear,
}: Props) {
    const [berhalanganOnly, setBerhalanganOnly] = useState(false);

    useAutoRefresh(true, 5000, ['siswas']);

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        const newFilters = { ...filters, [key]: value };

        router.get(
            guruLihatPresensi.index.url(),
            newFilters,
            { preserveState: true, preserveScroll: true },
        );
    };

    const statusLabel = (s: string) => {
        switch (s) {
            case 'hadir': return 'Hadir';
            case 'sakit': return 'Sakit';
            case 'izin': return 'Izin';
            case 'alpha': return 'Alpha';
            case 'dispensasi': return 'Dispensasi';
            default: return '-';
        }
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'hadir': return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
            case 'sakit': return 'bg-blue-100 text-blue-700 ring-blue-600/20';
            case 'izin': return 'bg-orange-100 text-orange-700 ring-orange-600/20';
            case 'alpha': return 'bg-red-100 text-red-700 ring-red-600/20';
            case 'dispensasi': return 'bg-indigo-100 text-indigo-700 ring-indigo-600/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const formatWaktu = (iso: string | null) => {
        if (!iso) return '-';
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
        } catch { return '-'; }
    };

    const stats = {
        hadir: siswas.filter((s) => s.absensi?.status === 'hadir').length,
        sakit: siswas.filter((s) => s.absensi?.status === 'sakit').length,
        izin: siswas.filter((s) => s.absensi?.status === 'izin').length,
    };

    const berhalanganSiswas = siswas.filter(
        (s) => s.absensi && (s.absensi.status === 'izin' || s.absensi.status === 'sakit'),
    );

    const shownSiswas = berhalanganOnly ? berhalanganSiswas : siswas;

    const showKeterangan = shownSiswas.some((s) => s.absensi?.keterangan);

    const namaKelas = kelasList.find((k) => k.id.toString() === filters.kelas_id)?.full_nama_kelas ?? null;

    const terbaru = siswas
        .filter((s) => s.absensi)
        .map((s) => s.absensi!)
        .sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime())[0];

    const totalSiswa = siswas.length;

    return (
        <>
            <Head title="Lihat Presensi" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Lihat Presensi Siswa
                        </h1>
                        <p className="text-muted-foreground">
                            Riwayat presensi siswa per kelas dan tanggal (Read-Only)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
                    <div className="col-span-1 flex flex-col gap-6">
                        <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border min-h-[260px] flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" /> Filter Data
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Kelas</label>
                                    <SearchableSelect
                                        value={filters.kelas_id || ''}
                                        onValueChange={(val) =>
                                            handleFilterChange('kelas_id', val)
                                        }
                                        placeholder="Pilih Kelas..."
                                        items={kelasList.map(k => ({
                                            value: k.id.toString(),
                                            label: k.full_nama_kelas,
                                        }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tanggal</label>
                                    <DateInput
                                        value={filters.tanggal}
                                        min={activeYear?.start}
                                        max={activeYear?.end}
                                        onChange={(iso) =>
                                            handleFilterChange(
                                                'tanggal',
                                                iso,
                                            )
                                        }
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="berhalangan"
                                        checked={berhalanganOnly}
                                        onCheckedChange={(checked) => setBerhalanganOnly(checked === true)}
                                    />
                                    <Label htmlFor="berhalangan" className="text-sm font-medium cursor-pointer">
                                        Berhalangan Hadir
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {filters.kelas_id && (
                        <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
                            {/* Statistik Rekap */}
                            <div className="grid grid-cols-3 gap-3">
                                <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20">
                                    <CardContent className="p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Hadir</p>
                                        <p className="text-xl font-bold text-emerald-600">{stats.hadir}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
                                    <CardContent className="p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Sakit</p>
                                        <p className="text-xl font-bold text-blue-600">{stats.sakit}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
                                    <CardContent className="p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Izin</p>
                                        <p className="text-xl font-bold text-orange-600">{stats.izin}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Badge informasi ringkas */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="gap-1.5 bg-card">
                                    <Calendar className="h-3.5 w-3.5 text-primary" /> {formatTanggalIndo(filters.tanggal)}
                                </Badge>
                                <Badge variant="outline" className="bg-card">
                                    {namaKelas ?? 'Kelas'}
                                </Badge>
                                <Badge variant="outline" className="gap-1.5 bg-card">
                                    <Users className="h-3.5 w-3.5 text-primary" /> {totalSiswa} Siswa
                                </Badge>
                                <Badge variant="outline" className="gap-1.5 bg-card">
                                    <Clock className="h-3.5 w-3.5 text-primary" /> Update {terbaru ? formatWaktu(terbaru.updated_at ?? terbaru.created_at) : '-'}
                                </Badge>
                            </div>

                            {/* Indikator Guru dan Waktu Aktif */}
                            <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 shadow-sm dark:border-sidebar-border flex items-start gap-3">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                {terbaru ? (
                                    <p className="text-sm text-muted-foreground">
                                        Indikator Guru dan Waktu Aktif: presensi terakhir divalidasi oleh{' '}
                                        <span className="font-semibold text-foreground">{terbaru.guru_nama ?? '-'}</span>{' '}
                                        pukul <span className="font-semibold text-foreground">{formatWaktu(terbaru.updated_at ?? terbaru.created_at)}</span> WIB.
                                        Guru lain dapat memvalidasi ulang data yang sama untuk kelas dan tanggal ini.
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Belum ada update untuk kelas ini pada tanggal {formatTanggalIndo(filters.tanggal)}.
                                    </p>
                                )}
                            </div>

                            {/* Tabel Presensi */}
                            <div className="rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border overflow-hidden flex flex-col animate-in fade-in duration-200">
                                <div className="p-6 border-b border-sidebar-border/70 dark:border-sidebar-border">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <UserCircle className="h-4 w-4 text-muted-foreground" /> Data Presensi
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {berhalanganOnly ? 'Menampilkan siswa berhalangan hadir saja' : 'Data kehadiran siswa per tanggal (Read-Only)'}
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            <tr>
                                                <th className="px-3 py-3 w-12 text-center">No</th>
                                                <th className="px-2 py-3 w-[92px] text-center whitespace-nowrap">NISN</th>
                                                <th className="px-6 py-4 min-w-[180px]">Nama Siswa</th>
                                                <th className="px-6 py-4 min-w-[140px]">Status</th>
                                                {showKeterangan && <th className="px-6 py-4 min-w-[200px]">Keterangan</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                            {shownSiswas.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4 + (showKeterangan ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <UserCircle className="h-8 w-8 opacity-20" />
                                                            <p>Tidak ada data presensi untuk filter ini.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                shownSiswas.map((siswa, index) => (
                                                    <tr key={siswa.id} className="hover:bg-muted/30">
                                                        <td className="px-3 py-3 text-center text-muted-foreground text-xs">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-2 py-3 font-mono text-[11px] font-medium whitespace-nowrap tracking-tight text-center">
                                                            {siswa.nisn}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-foreground">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-sidebar-border/50">
                                                                    <AvatarImage src={siswa.foto_url ?? undefined} alt={siswa.nama} />
                                                                    <AvatarFallback className="bg-neutral-100 text-xs font-semibold text-neutral-600">
                                                                        {siswa.nama.slice(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span>{siswa.nama}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {siswa.absensi ? (
                                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColor(siswa.absensi.status)}`}>
                                                                    {statusLabel(siswa.absensi.status)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                        {showKeterangan && (
                                                            <td className="px-6 py-4 text-muted-foreground text-sm">
                                                                {siswa.absensi?.keterangan || '-'}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
