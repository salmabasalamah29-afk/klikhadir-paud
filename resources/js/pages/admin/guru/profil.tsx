import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function GuruProfil({ guru }: { guru: Guru }) {
    useAutoRefresh(true, 5000);
    const jenisKelamin = guru.jenis_kelamin === 'perempuan' ? 'Perempuan' : guru.jenis_kelamin === 'laki-laki' ? 'Laki-laki' : '-';

    return (
        <>
            <Head title={`Profil ${guru.nama}`} />
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profil Guru</h1>
                        <p className="text-muted-foreground">Detail data guru.</p>
                    </div>
                    <Button variant="outline" size="sm" asChild className="bg-white text-[#093ff9] hover:bg-white/80" style={{ color: '#093ff9' }}>
                        <Link href={adminGuru.index.url()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Link>
                    </Button>
                </div>

                <Card className="mb-2">
                    <CardContent className="flex items-center gap-4 p-6">
                        <Avatar className="size-24 shrink-0 overflow-hidden rounded-full ring-2 ring-sidebar-border/70">
                            <AvatarImage src={guru.foto_url ?? undefined} alt={guru.nama} />
                            <AvatarFallback className="bg-neutral-100 text-2xl font-semibold text-neutral-500">
                                {guru.nama.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                guru.user?.password_default
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}
                        >
                            {guru.user?.password_default ? 'Status Sandi: Default' : 'Status Sandi: Sudah Diubah'}
                        </span>
                    </CardContent>
                </Card>

                <Card className="pt-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserRound className="h-4 w-4 text-primary" />
                            Data Pribadi
                        </CardTitle>
                        <CardDescription>Informasi dasar guru.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                            <p className="font-medium">{guru.nama}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Jenis Kelamin</p>
                            <p className="font-medium">{jenisKelamin}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

GuruProfil.layout = {
    breadcrumbs: [
        { title: 'Admin', href: adminDashboard.url() },
        { title: 'Guru', href: adminGuru.index.url() },
        { title: 'Profil Guru' },
    ],
};
