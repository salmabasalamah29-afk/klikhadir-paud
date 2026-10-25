import { Head, useForm, router, Link } from '@inertiajs/react';
import { Edit2, Trash2, Plus, Save, Users, KeyRound, Search, Eye } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import Pagination from '@/components/pagination';
import { PhotoUpload } from '@/components/photo-upload';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CsvImport from '@/components/csv-import';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard } from '@/routes/admin';
import adminGuru from '@/routes/admin/guru';

interface Guru {
    id: number;
    nama: string;
    jenis_kelamin?: 'laki-laki' | 'perempuan' | null;
    foto_url?: string | null;
    user?: {
        password_default: boolean;
    };
}

interface PaginatedData<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export default function GuruIndex({
    gurus,
}: {
    gurus: PaginatedData<Guru>;
}) {
    const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
    const [deletingGuruId, setDeletingGuruId] = useState<number | null>(null);
    const [resettingPasswordGuruId, setResettingPasswordGuruId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);

    useAutoRefresh(true, 5000);

    const [search, setSearch] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);

            return params.get('search') || '';
        }

        return '';
    });
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        nama: '',
        jenis_kelamin: '',
        password: '',
        foto: null as string | File | null,
        remove_foto: false,
    });

    const handleFotoChange = (file: File | null) => {
        setData('foto', file);
        setData('remove_foto', file === null);
    };

    const handleOpenCreate = () => {
        reset();
        clearErrors();
        setEditingGuru(null);
        setShowForm(true);
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            router.get(adminGuru.index.url(), { search: value || undefined }, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 400);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingGuru) {
            put(adminGuru.update.url({ guru: editingGuru.id }), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Data guru berhasil diperbarui');
                    router.reload({ only: ['gurus'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        } else {
            post(adminGuru.store.url(), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Guru berhasil ditambahkan', {
                        description: 'Akun guru telah dibuat dan siap digunakan.',
                    });
                    router.reload({ only: ['gurus'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        }
    };

    const handleEdit = (guru: Guru) => {
        setEditingGuru(guru);
        clearErrors();
        setData({
            nama: guru.nama,
            jenis_kelamin: guru.jenis_kelamin ?? '',
            password: '',
            foto: guru.foto_url ?? null,
            remove_foto: false,
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setEditingGuru(null);
        reset();
        clearErrors();
        setShowForm(false);
    };

    const executeDelete = () => {
        if (!deletingGuruId) {
            return;
        }

        router.delete(adminGuru.destroy.url({ guru: deletingGuruId }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Guru berhasil dihapus');
                setDeletingGuruId(null);
                router.reload({ only: ['gurus'], preserveScroll: true, preserveUrl: true } as unknown as never);
            },
            onError: () => setDeletingGuruId(null),
        });
    };

    const executeResetPassword = () => {
        if (!resettingPasswordGuruId) {
            return;
        }

        router.post(adminGuru.resetPassword.url({ guru: resettingPasswordGuruId }), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Kata Sandi guru berhasil direset ke default (kata sandi)');
                setResettingPasswordGuruId(null);
                router.reload({ only: ['gurus'], preserveScroll: true, preserveUrl: true } as unknown as never);
            },
            onError: () => setResettingPasswordGuruId(null),
        });
    };

    return (
        <>
            <Head title="Manajemen Guru" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Manajemen Guru
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola data dan akun akses guru.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleOpenCreate} className="min-w-28 bg-white text-black border border-zinc-200 shadow-xs hover:bg-zinc-50 dark:bg-white dark:text-black dark:border-zinc-200 dark:hover:bg-zinc-100">
                            <Plus className="h-4 w-4" /> Tambah
                        </Button>
                        <CsvImport entity="guru" title="Impor Guru" description="Header harus persis: nama, jenis_kelamin." />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama guru..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-9 bg-muted/30"
                        />
                    </div>
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    <tr>
                                        <th scope="col" className="px-3 py-2.5">
                                            Nama Guru
                                        </th>
                                        <th scope="col" className="px-3 py-2.5">
                                            Jenis Kelamin
                                        </th>
                                        <th scope="col" className="px-3 py-2.5">
                                            Status Kata Sandi
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2.5 text-right"
                                        >
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                    {gurus.data.map((guru) => (
                                        <tr
                                            key={guru.id}
                                            className={`group transition-colors hover:bg-muted/30 ${editingGuru?.id === guru.id ? 'bg-primary/5' : ''}`}
                                        >
                                            <td className="px-3 py-2.5 font-medium text-foreground">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="size-7 shrink-0 overflow-hidden rounded-full">
                                                        <AvatarImage src={guru.foto_url ?? undefined} alt={guru.nama} />
                                                        <AvatarFallback className="bg-neutral-100 text-xs font-semibold text-neutral-500">
                                                            {guru.nama.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs">{guru.nama}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {guru.jenis_kelamin === 'laki-laki' ? 'Laki-laki' : guru.jenis_kelamin === 'perempuan' ? 'Perempuan' : '-'}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {guru.user?.password_default ? (
                                                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                        Default
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Sudah Diubah
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                        title="Lihat Profil"
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    >
                                                        <Link href={adminGuru.profil.url({ guru: guru.id })}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setResettingPasswordGuruId(guru.id)}
                                                        title="Reset Kata Sandi"
                                                        className="h-7 w-7 text-muted-foreground hover:text-black"
                                                    >
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(guru)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingGuruId(guru.id)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {gurus.data.length === 0 && (
                                        <tr>
                                        <td
                                            colSpan={4}
                                            className="px-3 py-10 text-center text-muted-foreground"
                                        >
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-8 w-8 opacity-20" />
                                                    <p>Belum ada data guru.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <Pagination links={gurus.links} />
                </div>
            </div>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingGuru ? 'Edit Guru' : 'Tambah Guru'}</DialogTitle>
                        <DialogDescription>Kelola data guru</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Foto Profil</Label>
                            <PhotoUpload
                                value={data.foto}
                                onChange={handleFotoChange}
                                fallback={data.nama || 'Guru'}
                            />
                            {errors.foto && (
                                <p className="text-xs text-destructive">
                                    {errors.foto}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nama">Nama Lengkap</Label>
                            <Input
                                id="nama"
                                value={data.nama}
                                onChange={(e) =>
                                    setData('nama', e.target.value)
                                }
                                placeholder="Contoh: Lilis Lestari"
                                className="bg-muted/30"
                            />
                            {errors.nama && (
                                <p className="text-xs text-destructive">
                                    {errors.nama}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                            <select
                                id="jenis_kelamin"
                                className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
                                value={data.jenis_kelamin}
                                onChange={(e) =>
                                    setData('jenis_kelamin', e.target.value)
                                }
                            >
                                <option value="">Pilih Jenis Kelamin</option>
                                <option value="laki-laki">Laki-laki</option>
                                <option value="perempuan">Perempuan</option>
                            </select>
                            {errors.jenis_kelamin && (
                                <p className="text-xs text-destructive">
                                    {errors.jenis_kelamin}
                                </p>
                            )}
                        </div>

                        {editingGuru && (
                            <div className="space-y-2 pt-2 border-t border-sidebar-border mt-4">
                                <Label htmlFor="password">
                                    Kata Sandi Baru (Opsional)
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    placeholder="Minimal 8 karakter, kosongkan jika tidak diubah"
                                    className="bg-muted/30"
                                />
                                {errors.password && (
                                    <p className="text-xs text-destructive">
                                        {errors.password}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                                className="flex-1"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="flex-1"
                            >
                                {processing ? (
                                    'Proses...'
                                ) : editingGuru ? (
                                    <>
                                        <Save className="mr-2 h-4 w-4" /> Perbarui
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" /> Simpan
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deletingGuruId !== null} onOpenChange={(open) => !open && setDeletingGuruId(null)}>
                <AlertDialogContent>
                    <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                    <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus data guru ini? Semua data presensi terkait juga akan terhapus.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={resettingPasswordGuruId !== null} onOpenChange={(open) => !open && setResettingPasswordGuruId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Reset Kata Sandi</AlertDialogTitle>
                        <AlertDialogDescription>
                            Kata Sandi guru ini akan direset ke <strong>kata sandi</strong>. Guru wajib mengganti kata sandi setelah login berikutnya.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeResetPassword} className="bg-black hover:bg-black/90">
                            Reset Kata Sandi
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

GuruIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: adminDashboard.url() },
        { title: 'Guru', href: adminGuru.index.url() },
    ],
};
