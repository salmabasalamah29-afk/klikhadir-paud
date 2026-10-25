import { Head, router } from '@inertiajs/react';
import { Calendar, Clock, FileWarning, Search, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    nis: string;
    nama: string;
    foto_url?: string | null;
    absensi: {
        id: number | null;
        status: 'hadir' | 'sakit' | 'izin' | 'alpha' | 'dispensasi';
        keterangan: string | null;
        guru_nama: string | null;
        created_at: string | null;
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
    const [search, setSearch] = useState('');

    const filteredSiswas = siswas.filter((s) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return s.nis.toLowerCase().includes(term) || s.nama.toLowerCase().includes(term);
    });

    const showKeterangan = filteredSiswas.some(s => s.absensi?.keterangan);

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

    const formatHari = (iso: string) => {
        try {
            const d = new Date(iso + 'T00:00:00');
            return d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
        } catch { return '-'; }
    };

    const formatWaktu = (iso: string | null) => {
        if (!iso) return '-';
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
        } catch { return '-'; }
    };

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
                                    <Calendar className="h-4 w-4 text-primary" /> Filter Presensi
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
                                    <Input
                                        type="date"
                                        value={filters.tanggal}
                                        className="bg-muted/30"
                                        min={activeYear?.start}
                                        max={activeYear?.end}
                                        onChange={(e) =>
                                            handleFilterChange(
                                                'tanggal',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Cari Siswa</label>
                                    <Input
                                        placeholder="Cari NIS atau nama siswa..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="bg-muted/30"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
                        {filters.kelas_id && (
                            <div className="rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border overflow-hidden flex flex-col animate-in fade-in duration-200">
                                <div className="p-6 border-b border-sidebar-border/70 dark:border-sidebar-border flex flex-col gap-3">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                                <UserCircle className="h-4 w-4 text-muted-foreground" /> Riwayat Presensi
                                            </h2>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Data kehadiran siswa per tanggal (Read-Only)
                                            </p>
                                        </div>
                                        <div className="flex flex-col text-xs text-muted-foreground md:text-right font-medium shrink-0 gap-1 bg-muted/40 p-3 rounded-lg border border-sidebar-border/70">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-primary" /> {filters.tanggal}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-3 py-3 w-12 text-center">No</th>
                                                    <th className="px-2 py-3 w-[72px] text-center whitespace-nowrap">NIS</th>
                                                    <th className="px-6 py-4 min-w-[180px]">Nama Siswa</th>
                                                    <th className="px-6 py-4 min-w-[200px]">Status Kehadiran</th>
                                                    {showKeterangan && <th className="px-6 py-4 min-w-[200px]">Keterangan</th>}
                                                    <th className="px-6 py-4">Guru Terakhir</th>
                                                    <th className="px-6 py-4 text-right w-16">Waktu</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                                {filteredSiswas.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={showKeterangan ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <UserCircle className="h-8 w-8 opacity-20" />
                                                                <p>Tidak ada data presensi.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredSiswas.map((siswa, index) => (
                                                        <tr key={siswa.id} className="hover:bg-muted/30">
                                                            <td className="px-3 py-3 text-center text-muted-foreground text-xs">
                                                                {index + 1}
                                                            </td>
                                                            <td className="px-2 py-3 font-mono text-[11px] font-medium whitespace-nowrap tracking-tight text-center">
                                                                {siswa.nis}
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
                                                            <td className="px-6 py-4 text-muted-foreground text-sm">
                                                                {siswa.absensi?.guru_nama || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-muted-foreground text-xs">
                                                                {siswa.absensi ? formatWaktu(siswa.absensi.created_at) : '-'}
                                                            </td>
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
             </div>
         </>
     );
}
