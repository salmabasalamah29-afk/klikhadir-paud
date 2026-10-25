import { Head, router } from '@inertiajs/react';
import { CheckCircle, Clock, FileWarning, Trash2, UserCircle, BookOpen, Calendar, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import SearchableSelect from '@/components/ui/searchable-select';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import absensi from '@/routes/guru/absensi';

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
        status: 'hadir' | 'sakit' | 'izin';
        keterangan: string | null;
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

export default function GuruAbsensiIndex({
    kelasList,
    filters,
    siswas = [],
    activeYear,
    isOutOfYear,
}: Props) {
    const [localSiswas, setLocalSiswas] = useState<Siswa[]>(siswas);
    const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
    const [keterangans, setKeterangans] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {};
        siswas.forEach((s) => {
            if (s.absensi?.keterangan) {
                initial[s.id] = s.absensi.keterangan;
            }
        });
        return initial;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasDirty, setHasDirty] = useState(false);

    useEffect(() => {
        if (!hasDirty) {
            setLocalSiswas(siswas);
        }
    }, [siswas, hasDirty]);

    const showKeterangan = localSiswas.some(s => s.absensi?.status === 'sakit' || s.absensi?.status === 'izin');

    const handleFilterChange = (key: keyof Props['filters'], value: string) => {
        const newFilters = { ...filters, [key]: value };

        router.get(
            absensi.index.url(),
            newFilters,
            { preserveState: true, preserveScroll: true },
        );
    };

    const optimisticSetStatus = (siswaId: number, status: 'hadir' | 'sakit' | 'izin') => {
        setLocalSiswas((prev) =>
            prev.map((s) =>
                s.id === siswaId
                    ? {
                          ...s,
                          absensi: {
                              id: s.absensi?.id ?? null,
                              status,
                              keterangan: keterangans[siswaId] ?? s.absensi?.keterangan ?? null,
                          },
                      }
                    : s
            )
        );
        setHasDirty(true);
    };

    const handleStatusClick = (siswaId: number, status: 'hadir' | 'sakit' | 'izin') => {
        if (savingIds.has(siswaId) || isSubmitting) {
            return;
        }

        if (!filters.tanggal) {
            toast.error('Silakan pilih tanggal terlebih dahulu.');
            return;
        }

        if (!filters.kelas_id) {
            toast.error('Silakan pilih Kelas terlebih dahulu.');
            return;
        }

        optimisticSetStatus(siswaId, status);
    };

    const handleKeteranganChange = (siswaId: number, val: string) => {
        setKeterangans(prev => ({ ...prev, [siswaId]: val }));
        setHasDirty(true);
    };

    const handleDirectReset = (siswa: Siswa) => {
        if (!siswa.absensi) return;

        setSavingIds((prev) => new Set(prev).add(siswa.id));
        setLocalSiswas((prev) => prev.map((s) => (s.absensi?.id === siswa.id ? { ...s, absensi: null } : s)));
        setKeterangans((prev) => {
            const next = { ...prev };
            delete next[siswa.id];
            return next;
        });

        router.delete(absensi.destroy.url({ absensi: siswa.absensi.id }), {
            preserveScroll: true,
            async: true,
            onSuccess: () => {
                toast.success('Status kehadiran berhasil direset.');
                setHasDirty(true);
            },
            onError: () => {
                (router.reload as unknown as (opts: Record<string, unknown>) => void)({ only: ['siswas'], preserveScroll: true });
            },
            onFinish: () => {
                setSavingIds((prev) => {
                    const n = new Set(prev);
                    n.delete(siswa.id);
                    return n;
                });
                (router.reload as unknown as (opts: Record<string, unknown>) => void)({ only: ['siswas'], preserveScroll: true, async: true });
            },
        });
    };

    const handleBulkSubmit = () => {
        if (!filters.kelas_id || !filters.tanggal) {
            toast.error('Lengkapi Kelas dan Tanggal terlebih dahulu.');
            return;
        }
        if (localSiswas.length === 0) {
            toast.error('Tidak ada siswa untuk disimpan.');
            return;
        }

        const missingStatus = localSiswas.filter(s => !s.absensi?.status);
        if (missingStatus.length > 0) {
            const first = missingStatus[0];
            const idx = localSiswas.findIndex(s => s.id === first.id) + 1;
            toast.error(`Masih ada ${missingStatus.length} siswa belum diisi - ${first.nama} (No ${idx}).`);
            return;
        }

        const payload = localSiswas.map((s) => ({
            siswa_id: s.id,
            status: s.absensi!.status as string,
            keterangan: keterangans[s.id] ?? s.absensi?.keterangan ?? '',
        }));

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('kelas_id', filters.kelas_id);
        formData.append('tanggal', filters.tanggal);
        payload.forEach((p, idx) => {
            formData.append(`absensis[${idx}][siswa_id]`, String(p.siswa_id));
            formData.append(`absensis[${idx}][status]`, p.status);
            formData.append(`absensis[${idx}][keterangan]`, p.keterangan || '');
        });

        router.post('/guru/absensi/bulk', formData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Validasi kehadiran berhasil disimpan permanen ('+payload.length+' siswa).');
                setHasDirty(false);
                setLocalSiswas((prev) =>
                    prev.map((s) => {
                        const updated = payload.find((p) => p.siswa_id === s.id);
                        if (updated) {
                            return {
                                ...s,
                                absensi: {
                                    id: s.absensi?.id ?? null,
                                    status: updated.status,
                                    keterangan: updated.keterangan || null,
                                },
                            };
                        }
                        return s;
                    })
                );
                (router.reload as unknown as (opts: Record<string, unknown>) => void)({ only: ['siswas'], preserveScroll: true });
            },
            onError: (errors) => {
                const msg = Object.values(errors).flat().join('\n') || 'Gagal menyimpan validasi.';
                toast.error(msg);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <>
            <Head title="Input Presensi" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Input Presensi Siswa
                        </h1>
                        <p className="text-muted-foreground">
                            pilih kelas dan tanggal untuk merekam kehadiran siswa
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
                    <div className="col-span-1 flex flex-col gap-6">
                        <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border min-h-[260px] flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-primary" /> Presensi
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
                            </div>
                        </div>

                        {filters.kelas_id && (
                            <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border min-h-[260px] flex flex-col animate-in fade-in duration-200">
                                <div className="mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        Daftar Siswa
                                    </h2>
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
                                                <th className="px-6 py-4 text-right w-16">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                            {localSiswas.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={showKeterangan ? 6 : 5}
                                                        className="px-6 py-12 text-center text-muted-foreground"
                                                    >
                                                        <div className="flex flex-col items-center gap-2">
                                                            <UserCircle className="h-8 w-8 opacity-20" />
                                                            <p>Tidak ada siswa di kelas ini.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                localSiswas.map((siswa, index) => {
                                                    const isSaving = savingIds.has(siswa.id);
                                                    return (
                                                    <tr key={siswa.id} className={`group transition-colors hover:bg-muted/30 ${siswa.absensi ? 'bg-primary/5' : ''} ${isSaving ? 'opacity-60' : ''}`}>
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
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    {siswa.nama}
                                                                    {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isSaving || isSubmitting}
                                                                    variant={siswa.absensi?.status === 'hadir' ? 'default' : 'outline'}
                                                                    className={siswa.absensi?.status === 'hadir' ? 'bg-emerald-600 hover:bg-emerald-700 h-8 text-[11px] px-2.5' : 'hover:border-emerald-600 hover:text-emerald-600 bg-background/50 h-8 text-[11px] px-2.5 disabled:opacity-40'}
                                                                    onClick={() => handleStatusClick(siswa.id, 'hadir')}
                                                                >
                                                                    <CheckCircle className="mr-1 h-3.5 w-3.5" /> Hadir
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isSaving || isSubmitting}
                                                                    variant={siswa.absensi?.status === 'sakit' ? 'default' : 'outline'}
                                                                    className={siswa.absensi?.status === 'sakit' ? 'bg-blue-600 hover:bg-blue-700 h-8 text-[11px] px-2.5' : 'hover:border-blue-600 hover:text-blue-600 bg-background/50 h-8 text-[11px] px-2.5 disabled:opacity-40'}
                                                                    onClick={() => handleStatusClick(siswa.id, 'sakit')}
                                                                >
                                                                    <Clock className="mr-1 h-3.5 w-3.5" /> Sakit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isSaving || isSubmitting}
                                                                    variant={siswa.absensi?.status === 'izin' ? 'default' : 'outline'}
                                                                    className={siswa.absensi?.status === 'izin' ? 'bg-orange-600 hover:bg-orange-700 h-8 text-[11px] px-2.5' : 'hover:border-orange-600 hover:text-orange-600 bg-background/50 h-8 text-[11px] px-2.5 disabled:opacity-40'}
                                                                    onClick={() => handleStatusClick(siswa.id, 'izin')}
                                                                >
                                                                    <FileWarning className="mr-1 h-3.5 w-3.5" /> Izin
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        {showKeterangan && (
                                                            <td className="px-6 py-4">
                                                                {siswa.absensi?.status === 'sakit' || siswa.absensi?.status === 'izin' ? (
                                                                    <Input
                                                                        id={`keterangan-${siswa.id}`}
                                                                        placeholder="catatan..."
                                                                        value={keterangans[siswa.id] || ''}
                                                                        onChange={(e) => handleKeteranganChange(siswa.id, e.target.value)}
                                                                        className="h-8 bg-muted/30"
                                                                        disabled={isSaving}
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">-</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-right">
                                                            {siswa.absensi && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={isSaving}
                                                                    onClick={() => handleDirectReset(siswa)}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                    title="Reset"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <Button
                                        onClick={handleBulkSubmit}
                                        disabled={isSubmitting || localSiswas.length === 0}
                                        className="gap-2 rounded-xl bg-card px-6 h-9 text-sm font-medium text-foreground border border-sidebar-border/70 shadow-sm hover:bg-accent hover:text-accent-foreground"
                                    >
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                        {isSubmitting ? 'Menyimpan...' : 'Kirim'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
