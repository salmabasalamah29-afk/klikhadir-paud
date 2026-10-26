import { Camera, X } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PhotoUploadProps = {
    value: File | string | null;
    onChange: (file: File | null) => void;
    fallback: string;
    className?: string;
};

// Cache object URL per File agar preview stabil: meski referensi File berubah
// (mis. page re-render) URL tidak di-revoke saat render berjalan, sehingga
// gambar tidak kedap-kedip antara tampil dan hilang.
const objectUrlCache = new WeakMap<File, string>();

function resolvePreview(value: File | string | null): string | null {
    if (value instanceof File) {
        let url = objectUrlCache.get(value);

        if (!url) {
            url = URL.createObjectURL(value);
            objectUrlCache.set(value, url);
        }

        return url;
    }

    return typeof value === 'string' && value.length > 0 ? value : null;
}

function PhotoUploadBase({ value, onChange, fallback, className }: PhotoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState(() => resolvePreview(value));

    useEffect(() => {
        const next = resolvePreview(value);

        if (next !== preview) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreview(next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleRemove = () => {
        onChange(null);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className={cn('flex items-center gap-4', className)}>
            <Avatar className="size-16 shrink-0 overflow-hidden rounded-full ring-1 ring-sidebar-border/70">
                <AvatarImage src={preview ?? undefined} alt={fallback} />
                <AvatarFallback className="bg-neutral-100 text-sm font-semibold text-neutral-500">
                    {fallback.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                        <Camera className="mr-1.5 h-4 w-4" />
                        Pilih Foto
                    </Button>
                    {preview && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                            <X className="mr-1.5 h-4 w-4" />
                            Hapus
                        </Button>
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground">Format PNG/JPG, maksimal 5 MB.</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (file) {
                            onChange(file);
                        }
                    }}
                />
            </div>
        </div>
    );
}

export const PhotoUpload = memo(PhotoUploadBase);
