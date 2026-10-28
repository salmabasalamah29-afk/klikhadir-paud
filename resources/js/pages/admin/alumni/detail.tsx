import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard } from '@/routes/admin';
export default function AlumniDetail({ tahunAjaran, kelas, records }: any) {
  useAutoRefresh(true, 5000);
  return (
    <>
      <Head title={`Alumni ${kelas.full_nama_kelas} ${tahunAjaran.tahun_awal}/${tahunAjaran.tahun_akhir}`} />
      <div className="flex h-full w-full flex-1 flex-col gap-4 p-8">
        <div className="flex items-center gap-3">
          <Link href={`/admin/alumni/${tahunAjaran.id}`} className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{kelas.full_nama_kelas} — Alumni {tahunAjaran.tahun_awal}/{tahunAjaran.tahun_akhir}</h1>
            <p className="text-sm text-muted-foreground">{records.length} siswa</p>
          </div>
        </div>
        <Card>
          <CardHeader className="py-2.5 px-4"><CardTitle className="flex items-center gap-2 text-sm font-semibold leading-none"><GraduationCap className="h-4 w-4" /> {kelas.full_nama_kelas}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {records.length === 0 ? <div className="py-4 text-center text-sm text-muted-foreground">Belum ada alumni.</div> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40 text-xs"><TableHead className="w-[40px] text-center py-2">No</TableHead><TableHead className="w-[90px] py-2">NISN</TableHead><TableHead className="py-2">Nama</TableHead><TableHead className="w-[150px] py-2">Kelas</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {records.map((r: any, i: number) => (
                      <TableRow key={i} className="text-sm">
                        <TableCell className="text-center py-2">{i+1}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-6 shrink-0"><AvatarImage src={r.foto_url ?? undefined} /><AvatarFallback className="text-[9px]">{r.nama?.slice(0,2)?.toUpperCase()}</AvatarFallback></Avatar>
                            <span className="font-mono text-xs">{r.nisn}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium py-2 text-xs">{r.nama}</TableCell>
                        <TableCell className="text-xs py-2 whitespace-nowrap">{r.kelas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
AlumniDetail.layout = { breadcrumbs: [{ title: 'Admin', href: adminDashboard.url() }, { title: 'Alumni', href: '/admin/alumni' }, { title: 'Detail' }] };
