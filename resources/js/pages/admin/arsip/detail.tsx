import { Head, Link } from '@inertiajs/react';
import { FileSpreadsheet, GraduationCap, ArrowLeft, Calendar, Users, CheckCircle, Clock, FileWarning } from 'lucide-react';
import { useState, useMemo } from 'react';
import DateInput, { formatTanggalLengkap } from '@/components/date-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { dashboard as adminDashboard } from '@/routes/admin';
import adminTahunAjaran from '@/routes/admin/tahun-ajaran';

interface ArsipRecord {
  id: number;
  nisn: string;
  nama: string;
  foto_url: string | null;
  kelas: string;
  is_alumni: boolean;
  status: string;
  tanggal: string;
  tanggal_formatted: string;
  jam_ke: string | null;
  mapel: string;
  guru: string;
  keterangan: string | null;
}

export default function ArsipDetail({ tahunAjaran, kelas, records, stats }: { tahunAjaran: any; kelas: any; records: ArsipRecord[]; stats: any }) {
  useAutoRefresh(true, 5000);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const filtered = useMemo(() => {
    if (!selectedDate) {
return [];
}

    return records.filter((r) => r.tanggal === selectedDate);
  }, [records, selectedDate]);

  const filteredStats = useMemo(() => {
    const c: Record<string, number> = { hadir: 0, sakit: 0, izin: 0 };
    filtered.forEach((r) => {
        if (c[r.status] !== undefined) {
            c[r.status]++;
        }
    });

    return c;
  }, [filtered]);

  const showStats = selectedDate ? filteredStats : stats;

  const hasKeterangan = filtered.some((r) => r.keterangan != null && r.keterangan.toString().trim() !== '');

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'hadir':
        return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><CheckCircle className="h-3 w-3" /> Hadir</span>;
      case 'sakit':
        return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"><Clock className="h-3 w-3" /> Sakit</span>;
      case 'izin':
        return <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20"><FileWarning className="h-3 w-3" /> Izin</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const totalFiltered = filtered.length;
  const totalAll = Object.values(showStats as Record<string, number>).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0);

  return (
    <>
      <Head title={`Arsip ${kelas.full_nama_kelas} ${tahunAjaran.tahun_awal}/${tahunAjaran.tahun_akhir}`} />
      <div className="flex h-full w-full flex-1 flex-col gap-6 p-8">
        <div className="flex items-center gap-3">
          <Link href={`/admin/tahun-ajaran/${tahunAjaran.id}/arsip`} className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Arsip {tahunAjaran.tahun_awal}/{tahunAjaran.tahun_akhir} — {kelas.full_nama_kelas}</h1>
            <p className="text-sm text-muted-foreground font-normal">Data arsip dari semester awal sampai naik kelas — format terbaru guru (1 siswa 1 hari, prioritas berhalangan). Pilih tanggal atau ekspor.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
          <div className="col-span-1 flex flex-col gap-4">
            <div className="rounded-xl border border-sidebar-border/70 bg-card p-6 shadow-sm dark:border-sidebar-border sticky top-8 min-h-[260px] flex flex-col">
              <div className="mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> Filter Arsip</h2>
                <p className="text-xs text-muted-foreground mt-1">Pilih tanggal untuk melihat presensi per kelas per hari</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> Tanggal</label>
                  <DateInput value={selectedDate} onChange={(iso) => setSelectedDate(iso)} className="w-full bg-muted/30" />
                </div>
                <Button asChild className="w-full gap-2 h-9"><a href={`/admin/tahun-ajaran/${tahunAjaran.id}/arsip/kelas/${kelas.id}/export`}><FileSpreadsheet className="h-4 w-4" /> Ekspor Arsip</a></Button>
                <p className="text-xs text-muted-foreground">Data ekspor lengkap dalam rentang per tahun ajaran</p>
              </div>
            </div>
          </div>

          <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-4 shadow-sm text-center"><p className="text-xs text-muted-foreground">Hadir</p><p className="text-2xl font-bold text-emerald-600">{showStats.hadir}</p></div>
              <div className="rounded-xl border bg-card p-4 shadow-sm text-center"><p className="text-xs text-muted-foreground">Sakit</p><p className="text-2xl font-bold text-blue-600">{showStats.sakit}</p></div>
              <div className="rounded-xl border bg-card p-4 shadow-sm text-center"><p className="text-xs text-muted-foreground">Izin</p><p className="text-2xl font-bold text-orange-600">{showStats.izin}</p></div>
            </div>

            {selectedDate && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30"><Calendar className="h-3 w-3" /> {formatTanggalLengkap(selectedDate)}</span>
                <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30"><GraduationCap className="h-3 w-3" /> {kelas.full_nama_kelas}</span>
                <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30">total: {totalFiltered} siswa</span>
              </div>
            )}
            {!selectedDate && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30"><GraduationCap className="h-3 w-3" /> {kelas.full_nama_kelas}</span>
                <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30">total arsip: {totalAll} entri</span>
                <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 bg-muted/30">pilih tanggal untuk lihat detail</span>
              </div>
            )}

            {selectedDate ? (
              <div className="rounded-xl border border-sidebar-border/70 bg-card shadow-sm dark:border-sidebar-border overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4" /> {kelas.full_nama_kelas} — {formatTanggalLengkap(selectedDate)}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-3 w-10 text-center">No</th>
                        <th className="px-2 py-3 w-[72px] text-center whitespace-nowrap">NISN</th>
                        <th className="px-4 py-3 min-w-[160px]">Nama Siswa</th>
                        <th className="px-4 py-3">Status</th>
                        {hasKeterangan && <th className="px-4 py-3 min-w-[140px]">Keterangan</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.length === 0 ? (
                        <tr><td colSpan={4 + (hasKeterangan ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground"><div className="flex flex-col items-center gap-2"><Users className="h-8 w-8 opacity-20" /><p>Tidak ada data pada tanggal ini.</p></div></td></tr>
                      ) : (
                        filtered.map((r, i) => (
                          <tr key={`${r.id}-${r.tanggal}`} className="hover:bg-muted/30">
                            <td className="px-3 py-3 text-center text-muted-foreground text-xs">{i + 1}</td>
                            <td className="px-2 py-3 font-mono text-[11px] whitespace-nowrap tracking-tight text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Avatar className="size-6 shrink-0"><AvatarImage src={r.foto_url ?? undefined} /><AvatarFallback className="text-[9px]">{r.nama?.slice(0, 2)?.toUpperCase()}</AvatarFallback></Avatar>
                                <span>{r.nisn}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-xs">{r.nama} {r.is_alumni && <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700">Alumni</span>}</td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                            {hasKeterangan && <td className="px-4 py-3 text-xs truncate max-w-[180px]" title={r.keterangan || ''}>{r.keterangan || '-'}</td>}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Pilih tanggal terlebih dahulu untuk melihat detail presensi.</CardContent></Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
ArsipDetail.layout = { breadcrumbs: [{ title: 'Admin', href: adminDashboard.url() }, { title: 'Tahun Ajaran', href: adminTahunAjaran.index.url() }, { title: 'Arsip' }] };
