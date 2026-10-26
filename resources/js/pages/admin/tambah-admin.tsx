import { Head, useForm, router, usePage } from '@inertiajs/react';
import { Edit2, Trash2, Plus, Shield, KeyRound, Search, Mail, User, Lock } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CsvImport from '@/components/csv-import';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import admin, { dashboard as adminDashboard } from '@/routes/admin';
import adminAdmin from '@/routes/admin/admin';
import type { SharedData } from '@/types';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    username: string;
    password_default: boolean;
    created_at: string;
}

interface PaginatedData<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    admins: PaginatedData<AdminUser>;
    totalAdmins: number;
}

export default function TambahAdmin({ admins, totalAdmins }: Props) {
    const { auth } = usePage<SharedData>().props;
    const currentUserId = auth.user.id;

    const [showForm, setShowForm] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [deletingAdminId, setDeletingAdminId] = useState<number | null>(null);
    const [resettingPasswordAdminId, setResettingPasswordAdminId] = useState<number | null>(null);

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
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const handleSearch = (value: string) => {
        setSearch(value);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            router.get(
                window.location.pathname,
                { search: value || undefined },
                { preserveScroll: true, preserveState: true, replace: true },
            );
        }, 400);
    };

    const handleOpenCreate = () => {
        reset();
        clearErrors();
        setEditingAdmin(null);
        setShowForm(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAdmin) {
            put(adminAdmin.update.url({ admin: editingAdmin.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Data admin berhasil diperbarui');
                    router.reload({ only: ['admins'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        } else {
            post(adminAdmin.store.url(), {
                preserveScroll: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Admin berhasil ditambahkan');
                    router.reload({ only: ['admins'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        }
    };

    const handleEdit = (admin: AdminUser) => {
        setEditingAdmin(admin);
        clearErrors();
        setData({
            name: admin.name,
            email: admin.email,
            password: '',
            password_confirmation: '',
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setEditingAdmin(null);
        reset();
        clearErrors();
        setShowForm(false);
    };

    const executeDelete = () => {
        if (!deletingAdminId) return;
        router.delete(adminAdmin.destroy.url({ admin: deletingAdminId }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Admin berhasil dihapus');
                setDeletingAdminId(null);
                router.reload({ only: ['admins'], preserveScroll: true, preserveUrl: true } as unknown as never);
            },
            onError: () => setDeletingAdminId(null),
        });
    };

    const executeResetPassword = () => {
        if (!resettingPasswordAdminId) return;
        router.post(
            adminAdmin.resetPassword.url({ admin: resettingPasswordAdminId }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Kata Sandi admin berhasil direset ke default (kata sandi)');
                    setResettingPasswordAdminId(null);
                    router.reload({ only: ['admins'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
                onError: () => setResettingPasswordAdminId(null),
            },
        );
    };

    return (
        <>
            <Head title="Manajemen Admin" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Manajemen Admin</h1>
                        <p className="text-muted-foreground">Kelola akses admin secara terpusat.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleOpenCreate} className="min-w-28 bg-white text-black border border-zinc-200 shadow-xs hover:bg-zinc-50 dark:bg-white dark:text-black dark:border-zinc-200 dark:hover:bg-zinc-100">
                            <Plus className="h-4 w-4" /> Tambah
                        </Button>
                        <CsvImport entity="admin" title="Impor Admin" description="Header: nama, email, password" />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama atau email..."
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-9 bg-muted/30"
                        />
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/50 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-3 py-2.5">Nama</th>
                                        <th className="px-3 py-2.5">Email</th>
                                        <th className="px-3 py-2.5">Status Kata Sandi</th>
                                        <th className="px-3 py-2.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                    {admins.data.map((admin) => (
                                        <tr
                                            key={admin.id}
                                            className={`group transition-colors hover:bg-muted/30 ${editingAdmin?.id === admin.id ? 'bg-primary/5' : ''} ${admin.id === currentUserId ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}
                                        >
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                                        {admin.name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-foreground">
                                                            {admin.name}{' '}
                                                            {admin.id === currentUserId && (
                                                                <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                                    Anda
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <p className="text-xs font-medium">{admin.email}</p>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {admin.password_default ? (
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
                                                <div className="flex justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setResettingPasswordAdminId(admin.id)}
                                                        title="Reset Kata Sandi"
                                                        className="h-7 w-7 text-muted-foreground hover:text-yellow-600"
                                                    >
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(admin)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingAdminId(admin.id)}
                                                        disabled={admin.id === currentUserId || admins.data.length <= 1}
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-30"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {admins.data.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-10 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Shield className="h-7 w-7 opacity-20" />
                                                    <p className="text-xs">Belum ada data admin.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <Pagination links={admins.links} />
                </div>
            </div>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Tambah Admin'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama Lengkap
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Contoh: Budi Admin"
                                className="bg-muted/30"
                                required
                            />
                            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="admin@gmail.com"
                                className="bg-muted/30"
                                required
                            />
                            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Kata Sandi
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Minimal 8 karakter"
                                className="bg-muted/30"
                            />
                            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password_confirmation" className="flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Konfirmasi Kata Sandi
                            </Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="Ulangi kata sandi"
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing} className="flex-1">
                                {processing ? 'Proses...' : editingAdmin ? 'Perbarui' : 'Simpan'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deletingAdminId !== null} onOpenChange={(open) => !open && setDeletingAdminId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                        <AlertDialogDescription>Apakah Anda yakin ingin menghapus admin ini?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={resettingPasswordAdminId !== null} onOpenChange={(open) => !open && setResettingPasswordAdminId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Reset Kata Sandi</AlertDialogTitle>
                        <AlertDialogDescription>
                            Kata Sandi admin akan direset ke <strong>kata sandi</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeResetPassword} className="bg-yellow-600 hover:bg-yellow-700">
                            Reset Kata Sandi
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

TambahAdmin.layout = {
    breadcrumbs: [
        { title: 'Admin', href: adminDashboard.url() },
        { title: 'admin', href: admin.tambahAdmin.url() },
    ],
};
