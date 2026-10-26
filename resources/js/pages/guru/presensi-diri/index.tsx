import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle, Clock, FileWarning, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DateInput, { formatTanggalIndo } from '@/components/date-input';
import guruPresensiDiri from '@/routes/guru/presensi-diri';
import type { SharedData } from '@/types';

interface GuruPresensi {
    id: number;
    tanggal: string;
    status: 'hadir' | 'sakit' | 'izin';
    keterangan: string | null;
    created_at: string;
}

interface Props {
    guruPresensis: GuruPresensi[];
    todayPresensi: GuruPresensi | null;
    today: string;
}

export default function GuruPresensiDiriIndex({
    guruPresensis,
    todayPresensi,
    today,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const [status, setStatus] = useState<'hadir' | 'sakit' | 'izin'>('hadir');
    const [keterangan, setKeterangan] = useState('');
    const [tanggal, setTanggal] = useState(today);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!tanggal || !status) {
            toast.error('Tanggal dan status wajib diisi.');
            return;
        }

        setSubmitting(true);
        try {
            await router.post(guruPresensiDiri.store.url(), {
                tanggal,
                status,
                keterangan: status === 'izin' ? (keterangan || null) : null,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Presensi diri berhasil disimpan.');
                    setSubmitting(false);
                    (router.reload as unknown as (opts: Record<string, unknown>) => void)({ preserveScroll: true });
                },
                onError: () => {
                    setSubmitting(false);
                },
            });
        } catch {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus presensi ini?')) return;

        await router.delete(guruPresensiDiri.destroy.url({ presensi: id }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Presensi diri berhasil direset.');
                (router.reload as unknown as (opts: Record<string, unknown>) => void)({ preserveScroll: true });
            },
        });
    };

    const statusLabel = (s: string) => {
        switch (s) {
            case 'hadir': return 'Hadir';
            case 'sakit': return 'Sakit';
            case 'izin': return 'Izin';
            default: return s;
        }
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'hadir': return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
            case 'sakit': return 'bg-blue-100 text-blue-700 ring-blue-600/20';
            case 'izin': return 'bg-orange-100 text-orange-700 ring-orange-600/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const formatHari = (iso: string) => {
        try {
            const d = new Date(iso + 'T00:00:00');
            return d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
        } catch { return '-'; }
    };

    const formatWaktu = (iso: string) => {
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
        } catch { return '-'; }
    };

    return (
        <>
            <Head title="Presensi Diri Guru" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Presensi Diri Guru
                        </h1>
                        <p className="text-muted-foreground">
                            Catat kehadiran diri Anda setiap hari.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
                    {/* Form Presensi Diri */}
                    <div className="col-span-1 flex flex-col gap-6">
                        <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border min-h-[260px] flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" /> Presensi Hari Ini
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nama Guru</label>
                                    <Input
                                        value={auth.user.name}
                                        readOnly
                                        className="bg-muted/30 cursor-not-allowed opacity-80"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Tanggal</label>
                                    <DateInput
                                        value={tanggal}
                                        onChange={(iso) => setTanggal(iso)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={status === 'hadir' ? 'default' : 'outline'}
                                            className={status === 'hadir' ? 'bg-emerald-600 hover:bg-emerald-700 h-8 text-[11px] px-2.5' : 'hover:border-emerald-600 hover:text-emerald-600 bg-background/50 h-8 text-[11px] px-2.5'}
                                            onClick={() => setStatus('hadir')}
                                        >
                                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Hadir
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={status === 'sakit' ? 'default' : 'outline'}
                                            className={status === 'sakit' ? 'bg-blue-600 hover:bg-blue-700 h-8 text-[11px] px-2.5' : 'hover:border-blue-600 hover:text-blue-600 bg-background/50 h-8 text-[11px] px-2.5'}
                                            onClick={() => setStatus('sakit')}
                                        >
                                            <Clock className="mr-1 h-3.5 w-3.5" /> Sakit
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={status === 'izin' ? 'default' : 'outline'}
                                            className={status === 'izin' ? 'bg-orange-600 hover:bg-orange-700 h-8 text-[11px] px-2.5' : 'hover:border-orange-600 hover:text-orange-600 bg-background/50 h-8 text-[11px] px-2.5'}
                                            onClick={() => setStatus('izin')}
                                        >
                                            <FileWarning className="mr-1 h-3.5 w-3.5" /> Izin
                                        </Button>
                                    </div>
                                </div>

                                {status === 'izin' ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Keterangan</label>
                                        <Input
                                            value={keterangan}
                                            onChange={(e) => setKeterangan(e.target.value)}
                                            placeholder="Alasan izin..."
                                            className="bg-muted/30"
                                        />
                                    </div>
                                ) : null}

                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting || !tanggal || !status}
                                    className="w-full py-3"
                                >
                                    {submitting ? 'Menyimpan...' : 'Simpan Presensi'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Riwayat Presensi */}
                    <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
                        <div className="rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-sidebar-border/70 dark:border-sidebar-border">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <FileWarning className="h-4 w-4 text-primary" /> Riwayat Presensi
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Riwayat presensi diri guru (terbaru di atas)
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3 py-3 w-12 text-center">No</th>
                                            <th className="px-6 py-4">Hari &amp; Tanggal</th>
                                            <th className="px-6 py-4">Waktu Presensi</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Keterangan</th>
                                            <th className="px-6 py-4 text-right w-16">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                        {guruPresensis.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Clock className="h-8 w-8 opacity-20" />
                                                        <p>Belum ada riwayat presensi diri.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            guruPresensis.map((p, index) => (
                                                <tr key={p.id} className="hover:bg-muted/30">
                                                    <td className="px-3 py-3 text-center text-muted-foreground text-xs">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-foreground">
                                                        {formatHari(p.tanggal)} ({formatTanggalIndo(p.tanggal)})
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground text-xs">
                                                        {formatWaktu(p.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColor(p.status)}`}>
                                                            {statusLabel(p.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground text-sm">
                                                        {p.keterangan || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(p.id)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
