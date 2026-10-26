import { Head } from '@inertiajs/react';
import {
    CheckCircle,
    XCircle,
    X,
    Clock,
    FileWarning,
    Calendar,
    Award,
    ImageUp,
} from 'lucide-react';
import { useState } from 'react';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { dashboard as siswaDashboard } from '@/routes/siswa';

interface Absensi {
    id: number;
    tanggal: string;
    status: 'hadir' | 'sakit' | 'izin' | 'alpha' | 'dispensasi';
    keterangan: string | null;
    bukti: string | null;
    jam_ke: string | null;
    waktu_mulai: string | null;
    waktu_selesai: string | null;
}

interface Props {
    siswa: {
        id: number;
        nis: string;
        nisn: string;
        nama: string;
        foto_url?: string | null;
        kelas: {
            nama_kelas: string;
            full_nama_kelas?: string;
        };
    };
    stats: {
        hadir: number;
        sakit: number;
        izin: number;
        alpha: number;
        dispensasi: number;
    };
    history: Absensi[];
    activeYear?: { tahun_awal: string; tahun_akhir: string; start: string; end: string } | null;
}

export default function SiswaDashboard({ siswa, stats, history, activeYear = null }: Props) {
    const [previewBukti, setPreviewBukti] = useState<{ url: string; status?: string; tanggal?: string } | null>(null);
    useAutoRefresh(true, 6000, ['stats', 'history']);
    const hasKeterangan = history.some((r) => r.keterangan != null && r.keterangan.toString().trim() !== '');
    const hasSurat = history.some((r) => r.bukti != null && r.bukti.toString().trim() !== '');
    const formatTanggalLengkap = (iso: string) => {
        try {
            const d = new Date(iso.replace(' ', 'T'));
            if (isNaN(d.getTime())) return iso;
            return d.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
            });
        } catch { return iso; }
    };
    const getSuratLabel = (status: string, tanggal?: string) => {
        const jenis = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Surat';
        const nm = siswa.nama ? siswa.nama.toUpperCase().replace(/\s+/g, ' ').trim() : 'SISWA';
        const kls = siswa.kelas.full_nama_kelas ?? siswa.kelas.nama_kelas ?? '-';
        const tgl = tanggal ?? '-';
        return `${jenis}-${nm}-${kls}-${tgl}`;
    };
    const getStatusBadge = (status: string) => {
        switch (status) {
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
            case 'alpha':
                return <Badge variant="destructive">Alpha</Badge>;
            case 'dispensasi':
                return (
                    <Badge className="bg-indigo-500 hover:bg-indigo-600">
                        Dispensasi
                    </Badge>
                );
            default:
                return <Badge variant="secondary">Tidak Diketahui</Badge>;
        }
    };

    return (
        <>
            <Head title="Dashboard Siswa" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-center gap-4">
                    <Avatar className="size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-sidebar-border/60">
                        <AvatarImage src={siswa.foto_url ?? undefined} alt={siswa.nama} />
                        <AvatarFallback className="bg-white text-lg font-bold text-[#002399] dark:bg-white dark:text-[#002399]">
                            {siswa.nama.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {siswa.nama} — {siswa.kelas.full_nama_kelas || siswa.kelas.nama_kelas}
                        </h1>
                        <p className="text-sm text-muted-foreground">NISN: {siswa.nisn}</p>
                    </div>
                </div>

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

                {activeYear && (
                    <p className="text-xs text-muted-foreground">Riwayat menampilkan tahun ajaran aktif {activeYear.tahun_awal}/{activeYear.tahun_akhir} ({activeYear.start} s/d {activeYear.end}). Data tahun sebelumnya tersedia di Arsip admin.</p>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat Kehadiran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[240px]">Tanggal</TableHead>
                                        <TableHead className="w-[120px]">Status</TableHead>
                                        {hasKeterangan && <TableHead>Keterangan</TableHead>}
                                        {hasSurat && <TableHead className="w-[80px]">Surat</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={2 + (hasKeterangan ? 1 : 0) + (hasSurat ? 1 : 0)}
                                                className="h-24 text-center"
                                            >
                                                Belum ada data riwayat presensi.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        history.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        {formatTanggalLengkap(record.tanggal)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(record.status)}
                                                </TableCell>
                                                {hasKeterangan && <TableCell className="text-muted-foreground max-w-[200px] truncate">{record.keterangan || '-'}</TableCell>}
                                                {hasSurat && (
                                                    <TableCell>
                                                        {record.bukti ? (
                                                            <button
                                                                onClick={() => setPreviewBukti({ url: `/storage/${record.bukti}`, status: record.status, tanggal: record.tanggal })}
                                                                className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-muted/20 shadow-sm hover:ring-2 hover:ring-primary/20 transition-all"
                                                                title="Lihat surat"
                                                            >
                                                                <img src={`/storage/${record.bukti}`} alt={`Bukti ${record.status}`} className="h-full w-full object-cover" loading="lazy" decoding="async" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
                                                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10"><ImageUp className="h-2.5 w-2.5 text-white opacity-0 group-hover:opacity-100" /></span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={previewBukti !== null} onOpenChange={(open) => { if (!open) setPreviewBukti(null); }}>
                <DialogContent className="sm:max-w-[400px] w-auto max-h-[85vh] bg-transparent border-none shadow-none p-1 sm:p-2 [&>button]:hidden">
                    {previewBukti && (
                        <div className="bg-card rounded-xl px-4 py-4 shadow-2xl flex flex-col gap-4 relative w-auto max-w-[400px] mx-auto">
                            <button onClick={() => setPreviewBukti(null)} className="absolute left-4 top-4 h-8 w-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center" aria-label="Tutup">
                                <X className="h-4 w-4" />
                            </button>
                            <div className="text-center">
                                <h3 className="text-base font-semibold">Surat {previewBukti.status ? previewBukti.status.charAt(0).toUpperCase()+previewBukti.status.slice(1) : 'Presensi'}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono break-all">{getSuratLabel(previewBukti.status ?? 'surat', previewBukti.tanggal ? formatTanggalLengkap(previewBukti.tanggal) : '-')}.</p>
                            </div>
                            <div className="flex justify-center">
                                <img src={previewBukti.url} alt={`Surat ${previewBukti.status}`} className="max-w-full max-h-[50vh] rounded-lg object-contain" loading="eager" decoding="async" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}} />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

SiswaDashboard.layout = {
    breadcrumbs: [{ title: 'Siswa', href: siswaDashboard.url() }],
};
