import { Head } from '@inertiajs/react';
import { Calendar } from 'lucide-react';
import { formatTanggalLengkap } from '@/components/date-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as siswaDashboard } from '@/routes/siswa';

interface Absensi {
    id: number;
    tanggal: string;
    status: 'hadir' | 'sakit' | 'izin';
    keterangan: string | null;
    jam_ke: string | null;
    waktu_mulai: string | null;
    waktu_selesai: string | null;
}

interface Props {
    siswa: {
        id: number;
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
    };
    history: Absensi[];
    activeYear?: { tahun_awal: string; tahun_akhir: string; start: string; end: string } | null;
}

export default function SiswaDashboard({ siswa, stats, history, activeYear = null }: Props) {
    useAutoRefresh(true, 6000, ['stats', 'history']);
    const hasKeterangan = history.some((r) => r.keterangan != null && r.keterangan.toString().trim() !== '');
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
                    <p className="text-xs text-muted-foreground">Riwayat menampilkan tahun ajaran aktif {activeYear.tahun_awal}/{activeYear.tahun_akhir} ({formatTanggalLengkap(activeYear.start)} s/d {formatTanggalLengkap(activeYear.end)}). Data tahun sebelumnya tersedia di Arsip admin.</p>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={2 + (hasKeterangan ? 1 : 0)}
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
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SiswaDashboard.layout = {
    breadcrumbs: [{ title: 'Siswa', href: siswaDashboard.url() }],
};
