import { Head, useForm, router } from '@inertiajs/react';
import { Edit2, Trash2, Plus, Layers, Search } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import Pagination from '@/components/pagination';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CsvImport from '@/components/csv-import';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard } from '@/routes/admin';
import adminKelas from '@/routes/admin/kelas';

interface Kelas {
    id: number;
    nama_kelas: string | null;
    full_nama_kelas: string;
}

interface PaginatedData<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export default function KelasIndex({
    kelas,
    filters,
}: {
    kelas: PaginatedData<Kelas>;
    filters?: { search?: string | null };
}) {
    const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [deletingKelasId, setDeletingKelasId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters?.search ?? '');
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useAutoRefresh(true, 5000);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        nama_kelas: '',
    });

    const handleOpenCreate = () => {
        reset();
        clearErrors();
        setEditingKelas(null);
        setShowForm(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingKelas) {
            put(adminKelas.update.url({ kela: editingKelas.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Kelas berhasil diperbarui');
                    router.reload({ only: ['kelas'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        } else {
            post(adminKelas.store.url(), {
                preserveScroll: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Kelas berhasil ditambahkan');
                    router.reload({ only: ['kelas'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        }
    };

    const handleEdit = (k: Kelas) => {
        setEditingKelas(k);
        clearErrors();
        setData({
            nama_kelas: k.nama_kelas ?? '',
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setEditingKelas(null);
        reset();
        clearErrors();
        setShowForm(false);
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            router.get(adminKelas.index.url(), { search: value || undefined } as never, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 400);
    };

    const executeDelete = () => {
        if (!deletingKelasId) {
            return;
        }

        router.delete(adminKelas.destroy.url({ kela: deletingKelasId }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Kelas berhasil dihapus');
                setDeletingKelasId(null);
                router.reload({ only: ['kelas'], preserveScroll: true, preserveUrl: true } as unknown as never);
            },
            onError: () => setDeletingKelasId(null),
        });
    };

    return (
        <>
            <Head title="Manajemen Kelas" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Manajemen Kelas</h1>
                        <p className="text-muted-foreground">Kelola data kelas siswa.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleOpenCreate} className="min-w-28 bg-white text-black border border-zinc-200 shadow-xs hover:bg-zinc-50 dark:bg-white dark:text-black dark:border-zinc-200 dark:hover:bg-zinc-100">
                            <Plus className="h-4 w-4" /> Tambah
                        </Button>
                        <CsvImport entity="kelas" title="Impor Kelas" description="Header: nama_kelas" />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama kelas..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="bg-muted/30 pl-9"
                        />
                    </div>
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    <tr>
                                        <th scope="col" className="px-3 py-2.5 text-xs">
                                            Nama Kelas
                                        </th>
                                        <th scope="col" className="px-3 py-2.5 text-right text-xs">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                    {kelas.data.map((k) => (
                                        <tr
                                            key={k.id}
                                            className={`group transition-colors hover:bg-muted/30 ${editingKelas?.id === k.id ? 'bg-primary/5' : ''}`}
                                        >
                                            <td className="px-3 py-2.5 font-medium text-foreground">{k.full_nama_kelas}</td>
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(k)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingKelasId(k.id)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {kelas.data.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="px-3 py-10 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Layers className="h-8 w-8 opacity-20" />
                                                    <p>Belum ada data kelas.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <Pagination links={kelas.links} />
                </div>
            </div>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingKelas ? 'Edit Kelas' : 'Tambah Kelas'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nama_kelas">Nama Kelas</Label>
                            <Input
                                id="nama_kelas"
                                value={data.nama_kelas}
                                onChange={(e) => setData('nama_kelas', e.target.value)}
                                placeholder="Contoh: KB A"
                                className="bg-muted/30"
                            />
                            {errors.nama_kelas && <p className="text-xs text-destructive">{errors.nama_kelas}</p>}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing} className="flex-1">
                                {processing ? 'Proses...' : editingKelas ? 'Perbarui' : 'Simpan'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deletingKelasId !== null} onOpenChange={(open) => !open && setDeletingKelasId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus kelas ini? Semua data siswa terkait akan terhapus.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

KelasIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: adminDashboard.url() },
        { title: 'Kelas', href: adminKelas.index.url() },
    ],
};
