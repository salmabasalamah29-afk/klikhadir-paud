import { router } from '@inertiajs/react';
import { Download, Upload, FileSpreadsheet, File } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface CsvImportProps {
    entity: string;
    title?: string;
    description?: string;
}

export default function CsvImport({ entity, title, description }: CsvImportProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<{ success: string | null; title: string | null; errors: string[] } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const templateUrl = `/admin/import/template/${entity}`;
    const importUrl = `/admin/import/${entity}`;

    const displayTitle = title ? title.replace(' CSV', '') : 'Impor';

    const handleDownload = () => {
        window.location.href = templateUrl;
    };

    const handleImport = () => {
        if (!file) {
            toast.error('Pilih file CSV terlebih dahulu');
            return;
        }
        setUploading(true);
        setResult(null);
        const formData = new FormData();
        formData.append('file', file);

        router.post(importUrl, formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = (page.props as unknown as { flash?: { success?: string; error?: string; import_errors?: string[] } })?.flash;
                const propsFlash = (page.props as unknown as { import_errors?: string[]; flash?: { import_errors?: string[] } });
                const successMsg = flash?.success || (page.props as unknown as { success?: string })?.success || 'Impor berhasil diproses';
                const importErrors = flash?.import_errors || propsFlash?.import_errors || (page.props as unknown as { import_errors?: string[] })?.import_errors || [];
                const errorMsg = flash?.error || (page.props as unknown as { error?: string })?.error;

                if (errorMsg) {
                    // Jika ada per-baris error, tampilkan semua agar user tahu bagian mana yang gagal (jangan tutup modal)
                    toast.error(errorMsg);
                    setResult({ success: null, title: errorMsg, errors: importErrors });
                } else if (importErrors && importErrors.length > 0) {
                    toast.warning(successMsg);
                    setResult({ success: successMsg, title: null, errors: importErrors });
                } else {
                    toast.success(successMsg);
                    setResult({ success: successMsg, title: null, errors: [] });
                    setTimeout(() => {
                        setFile(null);
                        if (inputRef.current) inputRef.current.value = '';
                        setOpen(false);
                        setResult(null);
                    }, 1500);
                }
                router.reload({ preserveScroll: true, preserveUrl: true } as unknown as never);
            },
            onError: (errors) => {
                const msg = (errors as Record<string, string>).file || (errors as Record<string, string>).error || 'Gagal impor, periksa format CSV';
                toast.error(msg);
                setResult({ success: null, title: msg, errors: [] });
            },
            onFinish: () => setUploading(false),
        });
    };

    const headerText = description?.replace(/^Header:\s*/, '') || entity;
    const headerDescription = description
        ? description.startsWith('Header:')
            ? `Header harus persis: ${headerText}.`
            : description
        : `Impor data ${entity} via CSV.`;

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) setResult(null);
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" className="min-w-28 gap-2">
                    <Upload className="h-4 w-4" /> Impor
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[380px] gap-0">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-[15px]">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        {displayTitle}
                    </DialogTitle>
                    <DialogDescription className="text-xs leading-snug">
                        {headerDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3 pt-3">
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px]">
                        <span className="font-mono flex-1 truncate">{entity}.csv</span>
                        <Button variant="outline" size="sm" onClick={handleDownload} className="h-6 shrink-0 gap-1 px-2 text-[11px]">
                            <Download className="h-3 w-3" /> Unduh Template
                        </Button>
                    </div>

                    <div className="space-y-1.5">
                        <input
                            ref={inputRef}
                            id={`csv-input-${entity}`}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => {
                                setFile(e.target.files?.[0] ?? null);
                                setResult(null);
                            }}
                        />
                        <label
                            htmlFor={`csv-input-${entity}`}
                            className="flex cursor-pointer items-center gap-2.5 rounded-md border border-dashed border-sidebar-border/70 bg-muted/20 px-3 py-2.5 hover:bg-muted/40"
                        >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10">
                                <File className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex min-w-0 flex-col">
                                <span className="text-xs font-medium">Pilih File</span>
                                {file && (
                                    <span className="truncate text-[11px] text-muted-foreground">
                                        {file.name}
                                    </span>
                                )}
                            </div>
                        </label>
                    </div>

                    {result && (
                        <div className={`max-h-48 overflow-y-auto rounded-md border p-2.5 text-[11px] leading-snug ${result.errors.length ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300'}`}>
                            {(result.success || result.title) && (
                                <p className="text-xs font-medium leading-snug">{result.success ?? result.title}</p>
                            )}
                            {result.errors.length > 0 && (
                                <ol className={(result.success || result.title) ? 'mt-1.5 list-decimal space-y-1 pl-4' : 'list-decimal space-y-1 pl-4'}>
                                    {result.errors.map((e, i) => (
                                        <li key={i} className="break-words">{e}</li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={uploading} className="h-7 px-3 text-xs">
                            Batal
                        </Button>
                        <Button onClick={handleImport} disabled={!file || uploading} size="sm" className="h-7 gap-1 px-3 text-xs">
                            <Upload className="h-3.5 w-3.5" />
                            {uploading ? 'Mengimpor...' : 'Impor'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
