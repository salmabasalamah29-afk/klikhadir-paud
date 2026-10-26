import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, GraduationCap, Home, MapPin, Phone, UserRound, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { ProfilePhoto } from '@/components/profile-photo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard as siswaDashboard } from '@/routes/siswa';

interface Profil {
    id: number;
    nis: string;
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

export default function SiswaProfil({ profil }: { profil: Profil }) {
    const jenisKelamin = profil.jenis_kelamin === 'perempuan' ? 'Perempuan' : profil.jenis_kelamin === 'laki-laki' ? 'Laki-laki' : null;

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
        profil.nama_jalan,
        profil.desa,
        profil.kecamatan,
        profil.kabupaten_kota,
        profil.provinsi,
        profil.kode_pos,
    ].filter(Boolean).join(', ');

    return (
        <>
            <Head title={`Profil ${profil.nama}`} />
            <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profil Siswa</h1>
                    </div>
                    <Button variant="outline" size="sm" asChild className="bg-white text-[#093ff9] hover:bg-white/80" style={{ color: '#093ff9' }}>
                        <Link href={siswaDashboard.url()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                        <ProfilePhoto src={profil.foto_url} alt={profil.nama} />
                        <div>
                            <h2 className="text-xl font-bold">{profil.nama}</h2>
                            <p className="font-mono text-sm text-muted-foreground">NISN: {profil.nisn}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserRound className="h-4 w-4 text-primary" />
                            Data Pribadi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <Field label="Nama Lengkap">{profil.nama}</Field>
                        <Field label="Nama Panggilan">{profil.nama_panggilan || tidakTersedia}</Field>
                        <Field label="NISN"><span className="font-mono">{profil.nisn}</span></Field>
                        <Field label="NIK">{profil.nik ? <span className="font-mono">{profil.nik}</span> : tidakTersedia}</Field>
                        <Field label="Jenis Kelamin">{jenisKelamin ?? tidakTersedia}</Field>
                        <Field label="Tempat Lahir">{profil.tempat_lahir || tidakTersedia}</Field>
                        <Field label="Tanggal Lahir">{formatTanggal(profil.tanggal_lahir) ?? tidakTersedia}</Field>
                        <Field label="Agama">{profil.agama || tidakTersedia}</Field>
                        <Field label="Anak ke-">{profil.anak_ke || tidakTersedia}</Field>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Data Sekolah
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <Field label="Kelas">
                            {profil.kelas?.full_nama_kelas ? (
                                <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 ring-1 ring-inset ring-green-500/20 dark:text-green-400">
                                    {profil.kelas.full_nama_kelas}
                                </span>
                            ) : (
                                tidakTersedia
                            )}
                        </Field>
                        <Field label="Tanggal Masuk">{formatTanggal(profil.tanggal_masuk) ?? tidakTersedia}</Field>
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
                        <Field label="Nama Ayah">{profil.nama_ayah || tidakTersedia}</Field>
                        <Field label="Pekerjaan Ayah">{profil.pekerjaan_ayah || tidakTersedia}</Field>
                        <Field label="Nama Ibu">{profil.nama_ibu || tidakTersedia}</Field>
                        <Field label="Pekerjaan Ibu">{profil.pekerjaan_ibu || tidakTersedia}</Field>
                        <Field label="No. HP Orang Tua">
                            {profil.no_hp ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-mono">{profil.no_hp}</span>
                                </span>
                            ) : (
                                tidakTersedia
                            )}
                        </Field>
                    </CardContent>
                </Card>

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
                            <Field label="Desa / Kelurahan">{profil.desa || tidakTersedia}</Field>
                            <Field label="Kecamatan">{profil.kecamatan || tidakTersedia}</Field>
                            <Field label="Kabupaten / Kota">{profil.kabupaten_kota || tidakTersedia}</Field>
                            <Field label="Provinsi">{profil.provinsi || tidakTersedia}</Field>
                            <Field label="Kode Pos">{profil.kode_pos || tidakTersedia}</Field>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SiswaProfil.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: siswaDashboard.url() },
        { title: 'Profil' },
    ],
};
