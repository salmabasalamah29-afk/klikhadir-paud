import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, GraduationCap, Home, MapPin, Phone, UserRound, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard } from '@/routes/admin';
import adminSiswa from '@/routes/admin/siswa';

interface Siswa {
    id: number;
    nisn: string;
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
    user?: {
        password_default: boolean;
    };
    kelas?: {
        full_nama_kelas: string;
    } | null;
}

const tidakTersedia = <span className="text-xs text-muted-foreground italic">-</span>;

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium break-words">{children}</p>
        </div>
    );
}

export default function SiswaProfil({ siswa }: { siswa: Siswa }) {
    useAutoRefresh(true, 5000);

    const jenisKelamin = siswa.jenis_kelamin === 'perempuan' ? 'Perempuan' : siswa.jenis_kelamin === 'laki-laki' ? 'Laki-laki' : null;

    const formatTanggal = (value?: string | null) => {
        if (!value) return null;
        try {
            const d = new Date(value.replace(' ', 'T'));
            if (isNaN(d.getTime())) return value;
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
        } catch {
            return value;
        }
    };

    const alamatLengkap = [
        siswa.nama_jalan,
        siswa.desa,
        siswa.kecamatan,
        siswa.kabupaten_kota,
        siswa.provinsi,
        siswa.kode_pos,
    ].filter(Boolean).join(', ');

    return (
        <>
            <Head title={`Profil ${siswa.nama}`} />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profil Siswa</h1>
                    </div>
                    <Button variant="outline" size="sm" asChild className="bg-white text-[#093ff9] hover:bg-white/80" style={{ color: '#093ff9' }}>
                        <Link href={adminSiswa.index.url()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
                        <Avatar className="size-24 shrink-0 overflow-hidden rounded-full ring-2 ring-sidebar-border/70">
                            <AvatarImage src={siswa.foto_url ?? undefined} alt={siswa.nama} />
                            <AvatarFallback className="bg-neutral-100 text-2xl font-semibold text-neutral-500">
                                {siswa.nama.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
                            <h2 className="text-xl font-bold">{siswa.nama}</h2>
                            <p className="font-mono text-sm text-muted-foreground">NISN: {siswa.nisn}</p>
                            {siswa.user?.password_default ? (
                                <span className="mt-1 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    Status Sandi: Default
                                </span>
                            ) : (
                                <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    Status Sandi: Sudah Diubah
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <UserRound className="h-4 w-4 text-primary" />
                                Data Pribadi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <Field label="Nama Lengkap">{siswa.nama}</Field>
                            <Field label="Nama Panggilan">{siswa.nama_panggilan || tidakTersedia}</Field>
                            <Field label="NISN"><span className="font-mono">{siswa.nisn}</span></Field>
                            <Field label="NIK">{siswa.nik ? <span className="font-mono">{siswa.nik}</span> : tidakTersedia}</Field>
                            <Field label="Jenis Kelamin">{jenisKelamin ?? tidakTersedia}</Field>
                            <Field label="Tempat Lahir">{siswa.tempat_lahir || tidakTersedia}</Field>
                            <Field label="Tanggal Lahir">{formatTanggal(siswa.tanggal_lahir) ?? tidakTersedia}</Field>
                            <Field label="Agama">{siswa.agama || tidakTersedia}</Field>
                            <Field label="Anak ke-">{siswa.anak_ke || tidakTersedia}</Field>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                    Data Sekolah
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <Field label="Kelas">
                                    {siswa.kelas?.full_nama_kelas ? (
                                        <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 ring-1 ring-inset ring-green-500/20 dark:text-green-400">
                                            {siswa.kelas.full_nama_kelas}
                                        </span>
                                    ) : (
                                        tidakTersedia
                                    )}
                                </Field>
                                <Field label="Tanggal Masuk">{formatTanggal(siswa.tanggal_masuk) ?? tidakTersedia}</Field>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Users className="h-4 w-4 text-primary" />
                                    Orang Tua
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <Field label="Nama Ayah">{siswa.nama_ayah || tidakTersedia}</Field>
                                <Field label="Pekerjaan Ayah">{siswa.pekerjaan_ayah || tidakTersedia}</Field>
                                <Field label="Nama Ibu">{siswa.nama_ibu || tidakTersedia}</Field>
                                <Field label="Pekerjaan Ibu">{siswa.pekerjaan_ibu || tidakTersedia}</Field>
                                <Field label="No. HP Orang Tua">
                                    {siswa.no_hp ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-mono">{siswa.no_hp}</span>
                                        </span>
                                    ) : (
                                        tidakTersedia
                                    )}
                                </Field>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="h-4 w-4 text-primary" />
                            Alamat
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <Field label="Alamat Lengkap">
                            {alamatLengkap ? (
                                <span className="inline-flex items-start gap-1.5">
                                    <Home className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span>{alamatLengkap}</span>
                                </span>
                            ) : (
                                tidakTersedia
                            )}
                        </Field>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <Field label="Desa / Kelurahan">{siswa.desa || tidakTersedia}</Field>
                            <Field label="Kecamatan">{siswa.kecamatan || tidakTersedia}</Field>
                            <Field label="Kabupaten / Kota">{siswa.kabupaten_kota || tidakTersedia}</Field>
                            <Field label="Provinsi">{siswa.provinsi || tidakTersedia}</Field>
                            <Field label="Kode Pos">{siswa.kode_pos || tidakTersedia}</Field>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SiswaProfil.layout = {
    breadcrumbs: [
        { title: 'Admin', href: adminDashboard.url() },
        { title: 'Siswa', href: adminSiswa.index.url() },
        { title: 'Profil Siswa' },
    ],
};
