import { Head, useForm, router, Link } from '@inertiajs/react';
import { Edit2, Trash2, Plus, UserCircle, KeyRound, Search, Eye } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import Pagination from '@/components/pagination';
import { PhotoUpload } from '@/components/photo-upload';
import DateInput from '@/components/date-input';
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
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CsvImport from '@/components/csv-import';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard } from '@/routes/admin';
import adminSiswa from '@/routes/admin/siswa';

interface Kelas {
    id: number;
    nama_kelas: string | null;
    full_nama_kelas: string;
}

interface Siswa {
    id: number;
    nis: string;
    nisn?: string | null;
    nik?: string | null;
    nama: string;
    nama_panggilan?: string | null;
    jenis_kelamin?: 'laki-laki' | 'perempuan' | null;
    tempat_lahir?: string | null;
    tanggal_lahir?: string | null;
    agama?: string | null;
    tanggal_masuk?: string | null;
    nama_ayah?: string | null;
    pekerjaan_ayah?: string | null;
    nama_ibu?: string | null;
    pekerjaan_ibu?: string | null;
    no_hp?: string | null;
    anak_ke?: string | null;
    nama_jalan?: string | null;
    desa?: string | null;
    kecamatan?: string | null;
    kabupaten_kota?: string | null;
    provinsi?: string | null;
    kode_pos?: string | null;
    foto_url?: string | null;
    kelas_id: number;
    kelas?: Kelas;
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

function tanggalToIso(value: string): string {
    const trimmed = value.trim();

    if (trimmed === '') {
        return '';
    }

    const slash = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const dash = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    const match = slash ?? dash;

    return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

export default function SiswaIndex({
    siswas,
    kelasList,
    filters,
}: {
    siswas: PaginatedData<Siswa>;
    kelasList: Kelas[];
    filters?: { search?: string | null };
}) {
    const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
    const [deletingSiswaId, setDeletingSiswaId] = useState<number | null>(null);
    const [resettingPasswordSiswaId, setResettingPasswordSiswaId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('pribadi');
    const [fotoFile, setFotoFile] = useState<File | null>(null);

    useAutoRefresh(true, 5000);

    const [search, setSearch] = useState(filters?.search ?? (() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('search') || '';
        }
        return '';
    })() as string);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const { data, setData, post, put, processing, errors, reset, clearErrors, transform } = useForm({
        nisn: '',
        nik: '',
        nama: '',
        nama_panggilan: '',
        jenis_kelamin: '',
        tempat_lahir: '',
        tanggal_lahir: '',
        agama: '',
        tanggal_masuk: '',
        nama_ayah: '',
        pekerjaan_ayah: '',
        nama_ibu: '',
        pekerjaan_ibu: '',
        no_hp: '',
        anak_ke: '',
        nama_jalan: '',
        desa: '',
        kecamatan: '',
        kabupaten_kota: '',
        provinsi: '',
        kode_pos: '',
        kelas_id: '',
        password: '',
        foto: null as string | null,
        remove_foto: false,
    });

    const handleFotoChange = (file: File | null) => {
        setFotoFile(file);

        if (file === null) {
            setData('remove_foto', true);
            setData('foto', null);
        } else {
            setData('remove_foto', false);
        }
    };

    const handleOpenCreate = () => {
        reset();
        clearErrors();
        setFotoFile(null);
        setEditingSiswa(null);
        setActiveTab('pribadi');
        setShowForm(true);
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            router.get(adminSiswa.index.url(), { search: value || undefined } as never, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 400);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        transform((formData) => ({
            ...formData,
            tanggal_lahir: tanggalToIso(formData.tanggal_lahir),
            tanggal_masuk: tanggalToIso(formData.tanggal_masuk),
            foto: fotoFile ?? formData.foto,
        }));

        if (editingSiswa) {
            put(adminSiswa.update.url({ siswa: editingSiswa.id }), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Data siswa berhasil diperbarui');
                    router.reload({ only: ['siswas'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        } else {
            post(adminSiswa.store.url(), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    handleCancel();
                    toast.success('Siswa berhasil ditambahkan', {
                        description: 'Akun siswa telah dibuat.',
                    });
                    router.reload({ only: ['siswas'], preserveScroll: true, preserveUrl: true } as unknown as never);
                },
            });
        }
    };

    const handleEdit = (siswa: Siswa) => {
        setEditingSiswa(siswa);
        clearErrors();
        setFotoFile(null);
        setData({
            nisn: siswa.nisn ?? '',
            nik: siswa.nik ?? '',
            nama: siswa.nama,
            nama_panggilan: siswa.nama_panggilan ?? '',
            jenis_kelamin: siswa.jenis_kelamin ?? '',
            tempat_lahir: siswa.tempat_lahir ?? '',
            tanggal_lahir: siswa.tanggal_lahir ?? '',
            agama: siswa.agama ?? '',
            tanggal_masuk: siswa.tanggal_masuk ?? '',
            nama_ayah: siswa.nama_ayah ?? '',
            pekerjaan_ayah: siswa.pekerjaan_ayah ?? '',
            nama_ibu: siswa.nama_ibu ?? '',
            pekerjaan_ibu: siswa.pekerjaan_ibu ?? '',
            no_hp: siswa.no_hp ?? '',
            anak_ke: siswa.anak_ke ?? '',
            nama_jalan: siswa.nama_jalan ?? '',
            desa: siswa.desa ?? '',
            kecamatan: siswa.kecamatan ?? '',
            kabupaten_kota: siswa.kabupaten_kota ?? '',
            provinsi: siswa.provinsi ?? '',
            kode_pos: siswa.kode_pos ?? '',
            kelas_id: siswa.kelas_id.toString(),
            password: '',
            foto: siswa.foto_url ?? null,
            remove_foto: false,
        });
        setActiveTab('pribadi');
        setShowForm(true);
    };

    const handleCancel = () => {
        setEditingSiswa(null);
        setFotoFile(null);
        reset();
        clearErrors();
        setShowForm(false);
    };

    const executeDelete = () => {
        if (!deletingSiswaId) {
            return;
        }

        router.delete(adminSiswa.destroy.url({ siswa: deletingSiswaId }), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Siswa berhasil dihapus');
                setDeletingSiswaId(null);
                router.reload({ only: ['siswas'], preserveScroll: true, preserveUrl: true } as unknown as never);
            },
            onError: () => setDeletingSiswaId(null),
        });
    };

    const executeResetPassword = () => {
        if (!resettingPasswordSiswaId) {
            return;
        }

        router.post(adminSiswa.resetPassword.url({ siswa: resettingPasswordSiswaId }), {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Kata Sandi siswa berhasil direset ke default (kata sandi)');
                setResettingPasswordSiswaId(null);
                router.reload({ only: ['siswas'], preserveScroll: true, preserveUrl: true } as unknown as never);
            },
            onError: () => setResettingPasswordSiswaId(null),
        });
    };

    return (
        <>
            <Head title="Manajemen Siswa" />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Manajemen Siswa
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola data dan akun akses siswa.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleOpenCreate} className="min-w-28 bg-white text-black border border-zinc-200 shadow-xs hover:bg-zinc-50 dark:bg-white dark:text-black dark:border-zinc-200 dark:hover:bg-zinc-100">
                            <Plus className="h-4 w-4" /> Tambah
                        </Button>
                        <CsvImport entity="siswa" title="Impor Siswa" description="Header: nisn, nik, nama, nama_panggilan, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, tanggal_masuk, kelas, nama_ayah, pekerjaan_ayah, nama_ibu, pekerjaan_ibu, no_hp, anak_ke, nama_jalan, desa, kecamatan, kabupaten_kota, provinsi, kode_pos" />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama, NISN, atau kelas..."
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
                                        <th scope="col" className="px-3 py-2.5 w-[110px] text-center whitespace-nowrap">
                                            NISN
                                        </th>
                                        <th scope="col" className="px-3 py-2.5 w-[130px] text-center whitespace-nowrap">
                                            NIK
                                        </th>
                                        <th scope="col" className="px-3 py-2.5">
                                            Nama Lengkap
                                        </th>
                                        <th scope="col" className="px-3 py-2.5">
                                            Kelas
                                        </th>
                                        <th scope="col" className="px-3 py-2.5">
                                            Jenis Kelamin
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
                                    {siswas.data.map((siswa) => (
                                        <tr
                                            key={siswa.id}
                                            className={`group transition-colors hover:bg-muted/30 ${editingSiswa?.id === siswa.id ? 'bg-primary/5' : ''}`}
                                        >
                                            <td className="px-3 py-2.5 font-mono text-[11px] font-medium whitespace-nowrap tracking-tight text-center w-[110px]">
                                                {siswa.nisn || '-'}
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap tracking-tight text-center w-[130px]">
                                                {String(siswa.nik ?? '-')}
                                            </td>
                                            <td className="px-3 py-2.5 font-medium text-foreground text-xs">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="size-7 shrink-0 overflow-hidden rounded-full">
                                                        <AvatarImage src={siswa.foto_url ?? undefined} alt={siswa.nama} />
                                                        <AvatarFallback className="bg-neutral-100 text-xs font-semibold text-neutral-500">
                                                            {siswa.nama.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="font-medium">{siswa.nama}</span>
                                                        {siswa.nama_panggilan && (
                                                            <span className="text-xs text-muted-foreground">{siswa.nama_panggilan}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-muted-foreground text-xs">
                                                {siswa.kelas?.full_nama_kelas || '-'}
                                            </td>
                                            <td className="px-3 py-2.5 text-muted-foreground text-xs">
                                                {siswa.jenis_kelamin === 'laki-laki' ? 'Laki-laki' : siswa.jenis_kelamin === 'perempuan' ? 'Perempuan' : '-'}
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
                                                        <Link href={adminSiswa.profil.url({ siswa: siswa.id })}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setResettingPasswordSiswaId(siswa.id)}
                                                        title="Reset Kata Sandi"
                                                        className="h-7 w-7 text-muted-foreground hover:text-black"
                                                    >
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(siswa)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingSiswaId(siswa.id)}
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {siswas.data.length === 0 && (
                                        <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-3 py-10 text-center text-muted-foreground"
                                                >
                                                <div className="flex flex-col items-center gap-2">
                                                    <UserCircle className="h-8 w-8 opacity-20" />
                                                    <p className="text-xs">Belum ada data siswa.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <Pagination links={siswas.links} />
                </div>
            </div>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingSiswa ? 'Edit Siswa' : 'Tambah Siswa'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                onClick={() => setActiveTab('pribadi')}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'pribadi' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                Data Pribadi
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setActiveTab('ortu')}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'ortu' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                Orang Tua & Alamat
                            </Button>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            {activeTab === 'pribadi' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Foto Profil</Label>
                                        <PhotoUpload
                                            value={fotoFile ?? data.foto}
                                            onChange={handleFotoChange}
                                            fallback={data.nama || 'Siswa'}
                                        />
                                        {errors.foto && (
                                            <p className="text-xs text-destructive">
                                                {errors.foto}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="nisn">NISN</Label>
                                            <Input
                                                id="nisn"
                                                value={data.nisn}
                                                onChange={(e) => setData('nisn', e.target.value)}
                                                placeholder="Nomor Induk Siswa Nasional"
                                                className="bg-muted/30"
                                            />
                                            {errors.nisn && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nisn}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="nik">NIK</Label>
                                            <Input
                                                id="nik"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={20}
                                                value={data.nik}
                                                onChange={(e) => setData('nik', e.target.value.replace(/\D/g, ''))}
                                                placeholder="Nomor Induk Kependudukan"
                                                className="bg-muted/30 font-mono"
                                            />
                                            {errors.nik && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nik}
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
                                                placeholder="Nama Siswa Lengkap"
                                                className="bg-muted/30"
                                            />
                                            {errors.nama && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nama}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="nama_panggilan">Nama Panggilan</Label>
                                            <Input
                                                id="nama_panggilan"
                                                value={data.nama_panggilan}
                                                onChange={(e) =>
                                                    setData('nama_panggilan', e.target.value)
                                                }
                                                placeholder="Nama Panggilan"
                                                className="bg-muted/30"
                                            />
                                            {errors.nama_panggilan && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nama_panggilan}
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

                                        <div className="space-y-2">
                                            <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                                            <Input
                                                id="tempat_lahir"
                                                value={data.tempat_lahir}
                                                onChange={(e) =>
                                                    setData('tempat_lahir', e.target.value)
                                                }
                                                placeholder="Tempat Lahir"
                                                className="bg-muted/30"
                                            />
                                            {errors.tempat_lahir && (
                                                <p className="text-xs text-destructive">
                                                    {errors.tempat_lahir}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                                            <DateInput
                                                id="tanggal_lahir"
                                                value={data.tanggal_lahir}
                                                onChange={(iso) => setData('tanggal_lahir', iso)}
                                            />
                                            {errors.tanggal_lahir && (
                                                <p className="text-xs text-destructive">
                                                    {errors.tanggal_lahir}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="agama">Agama</Label>
                                            <select
                                                id="agama"
                                                className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
                                                value={data.agama}
                                                onChange={(e) => setData('agama', e.target.value)}
                                            >
                                                <option value="">Pilih Agama</option>
                                                <option value="Islam">Islam</option>
                                                <option value="Kristen">Kristen</option>
                                                <option value="Katolik">Katolik</option>
                                                <option value="Hindu">Hindu</option>
                                                <option value="Buddha">Buddha</option>
                                                <option value="Konghucu">Konghucu</option>
                                            </select>
                                            {errors.agama && (
                                                <p className="text-xs text-destructive">
                                                    {errors.agama}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="tanggal_masuk">Tanggal Masuk</Label>
                                            <DateInput
                                                id="tanggal_masuk"
                                                value={data.tanggal_masuk}
                                                onChange={(iso) => setData('tanggal_masuk', iso)}
                                            />
                                            {errors.tanggal_masuk && (
                                                <p className="text-xs text-destructive">
                                                    {errors.tanggal_masuk}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="kelas_id">Kelas</Label>
                                            <select
                                                id="kelas_id"
                                                className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-xs shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
                                                value={data.kelas_id}
                                                onChange={(e) =>
                                                    setData('kelas_id', e.target.value)
                                                }
                                            >
                                                <option value="">Pilih Kelas</option>
                                                {kelasList.map((k) => (
                                                    <option key={k.id} value={k.id}>
                                                        {k.full_nama_kelas}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.kelas_id && (
                                                <p className="text-xs text-destructive">
                                                    {errors.kelas_id}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {editingSiswa && (
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
                                </>
                            )}

                            {activeTab === 'ortu' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="nama_ayah">Nama Ayah</Label>
                                            <Input
                                                id="nama_ayah"
                                                value={data.nama_ayah}
                                                onChange={(e) =>
                                                    setData('nama_ayah', e.target.value)
                                                }
                                                placeholder="Nama Ayah"
                                                className="bg-muted/30"
                                            />
                                            {errors.nama_ayah && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nama_ayah}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="pekerjaan_ayah">Pekerjaan Ayah</Label>
                                            <Input
                                                id="pekerjaan_ayah"
                                                value={data.pekerjaan_ayah}
                                                onChange={(e) =>
                                                    setData('pekerjaan_ayah', e.target.value)
                                                }
                                                placeholder="Pekerjaan Ayah"
                                                className="bg-muted/30"
                                            />
                                            {errors.pekerjaan_ayah && (
                                                <p className="text-xs text-destructive">
                                                    {errors.pekerjaan_ayah}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="nama_ibu">Nama Ibu</Label>
                                            <Input
                                                id="nama_ibu"
                                                value={data.nama_ibu}
                                                onChange={(e) =>
                                                    setData('nama_ibu', e.target.value)
                                                }
                                                placeholder="Nama Ibu"
                                                className="bg-muted/30"
                                            />
                                            {errors.nama_ibu && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nama_ibu}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="pekerjaan_ibu">Pekerjaan Ibu</Label>
                                            <Input
                                                id="pekerjaan_ibu"
                                                value={data.pekerjaan_ibu}
                                                onChange={(e) =>
                                                    setData('pekerjaan_ibu', e.target.value)
                                                }
                                                placeholder="Pekerjaan Ibu"
                                                className="bg-muted/30"
                                            />
                                            {errors.pekerjaan_ibu && (
                                                <p className="text-xs text-destructive">
                                                    {errors.pekerjaan_ibu}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="no_hp">No. HP Orang Tua</Label>
                                            <Input
                                                id="no_hp"
                                                value={data.no_hp}
                                                onChange={(e) =>
                                                    setData('no_hp', e.target.value)
                                                }
                                                placeholder="Nomor HP"
                                                className="bg-muted/30"
                                            />
                                            {errors.no_hp && (
                                                <p className="text-xs text-destructive">
                                                    {errors.no_hp}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="anak_ke">Anak ke-</Label>
                                            <Input
                                                id="anak_ke"
                                                value={data.anak_ke}
                                                onChange={(e) =>
                                                    setData('anak_ke', e.target.value)
                                                }
                                                placeholder="Anak ke-"
                                                className="bg-muted/30"
                                            />
                                            {errors.anak_ke && (
                                                <p className="text-xs text-destructive">
                                                    {errors.anak_ke}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="nama_jalan">Nama Jalan</Label>
                                            <Input
                                                id="nama_jalan"
                                                value={data.nama_jalan}
                                                onChange={(e) =>
                                                    setData('nama_jalan', e.target.value)
                                                }
                                                placeholder="Nama Jalan"
                                                className="bg-muted/30"
                                            />
                                            {errors.nama_jalan && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nama_jalan}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="desa">Desa / Kelurahan</Label>
                                            <Input
                                                id="desa"
                                                value={data.desa}
                                                onChange={(e) =>
                                                    setData('desa', e.target.value)
                                                }
                                                placeholder="Desa / Kelurahan"
                                                className="bg-muted/30"
                                            />
                                            {errors.desa && (
                                                <p className="text-xs text-destructive">
                                                    {errors.desa}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="kecamatan">Kecamatan</Label>
                                            <Input
                                                id="kecamatan"
                                                value={data.kecamatan}
                                                onChange={(e) =>
                                                    setData('kecamatan', e.target.value)
                                                }
                                                placeholder="Kecamatan"
                                                className="bg-muted/30"
                                            />
                                            {errors.kecamatan && (
                                                <p className="text-xs text-destructive">
                                                    {errors.kecamatan}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="kabupaten_kota">Kabupaten / Kota</Label>
                                            <Input
                                                id="kabupaten_kota"
                                                value={data.kabupaten_kota}
                                                onChange={(e) =>
                                                    setData('kabupaten_kota', e.target.value)
                                                }
                                                placeholder="Kabupaten / Kota"
                                                className="bg-muted/30"
                                            />
                                            {errors.kabupaten_kota && (
                                                <p className="text-xs text-destructive">
                                                    {errors.kabupaten_kota}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="provinsi">Provinsi</Label>
                                            <Input
                                                id="provinsi"
                                                value={data.provinsi}
                                                onChange={(e) =>
                                                    setData('provinsi', e.target.value)
                                                }
                                                placeholder="Provinsi"
                                                className="bg-muted/30"
                                            />
                                            {errors.provinsi && (
                                                <p className="text-xs text-destructive">
                                                    {errors.provinsi}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="kode_pos">Kode Pos</Label>
                                            <Input
                                                id="kode_pos"
                                                value={data.kode_pos}
                                                onChange={(e) =>
                                                    setData('kode_pos', e.target.value)
                                                }
                                                placeholder="Kode Pos"
                                                className="bg-muted/30"
                                            />
                                            {errors.kode_pos && (
                                                <p className="text-xs text-destructive">
                                                    {errors.kode_pos}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </>
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
                                    {processing ? 'Proses...' : editingSiswa ? 'Perbarui' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deletingSiswaId !== null} onOpenChange={(open) => !open && setDeletingSiswaId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus data siswa ini?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={resettingPasswordSiswaId !== null} onOpenChange={(open) => !open && setResettingPasswordSiswaId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Reset Kata Sandi</AlertDialogTitle>
                        <AlertDialogDescription>
                            Kata Sandi siswa ini akan direset ke <strong>kata sandi</strong>. Siswa wajib mengganti kata sandi setelah login berikutnya.
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

SiswaIndex.layout = {
    breadcrumbs: [
        { title: 'Admin', href: adminDashboard.url() },
        { title: 'Siswa', href: adminSiswa.index.url() },
    ],
};
