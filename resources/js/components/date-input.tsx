import { Calendar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type DateInputProps = {
    id?: string;
    name?: string;
    value?: string | null;
    onChange: (iso: string) => void;
    min?: string | null;
    max?: string | null;
    placeholder?: string;
    className?: string;
};

/** '2026-01-26' -> '26-01-2026' */
export function formatIsoToDdMmYyyy(value?: string | null): string {
    if (!value) {
        return '';
    }

    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    return match
        ? `${match[3].padStart(2, '0')}-${match[2].padStart(2, '0')}-${match[1]}`
        : value;
}

/** '2026-01-26' -> '26-01-2026' atau '-' */
export function formatTanggalIndo(value?: string | null): string {
    return formatIsoToDdMmYyyy(value) || '-';
}

/** '26-01-2026' -> '2026-01-26' (null bila tidak valid) */
export function ddMmYyyyToIso(text: string): string | null {
    const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);

    if (!match) {
        return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }

    return `${match[3]}-${match[2]}-${match[1]}`;
}

/** Format progresif saat mengetik: '26012026' -> '26-01-2026' */
export function maskDdMmYyyy(input: string): string {
    const digits = input.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 2) {
        return digits;
    }

    if (digits.length <= 4) {
        return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/**
 * Input tanggal dengan tampilan DD-MM-YYYY (standar Indonesia).
 * Nilai yang dikirim/diterima tetap ISO 'YYYY-MM-DD'.
 * Dilengkapi date picker kalender via native input tersembunyi.
 */
export default function DateInput({
    id,
    value,
    onChange,
    min,
    max,
    placeholder = 'dd-mm-yyyy',
    className,
}: DateInputProps) {
    const pickerRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState(() => formatIsoToDdMmYyyy(value));

    useEffect(() => {
        const iso = value ?? '';

        if (!iso) {
            return;
        }

        if (ddMmYyyyToIso(text) !== iso) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setText(formatIsoToDdMmYyyy(iso));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleType = (event: React.ChangeEvent<HTMLInputElement>) => {
        const masked = maskDdMmYyyy(event.target.value);

        setText(masked);

        const iso = ddMmYyyyToIso(masked);

        if (iso !== null || masked === '') {
            onChange(iso ?? '');
        }
    };

    const handleBlur = () => {
        const iso = ddMmYyyyToIso(text);

        if (iso === null && text !== '') {
            setText(formatIsoToDdMmYyyy(value));
        }
    };

    const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const iso = event.target.value;

        if (!iso) {
            return;
        }

        onChange(iso);
        setText(formatIsoToDdMmYyyy(iso));
    };

    const openPicker = () => {
        const element = pickerRef.current;

        if (!element) {
            return;
        }

        try {
            if (typeof element.showPicker === 'function') {
                element.showPicker();

                return;
            }
        } catch {
            // browser menolak showPicker, fallback fokus manual
        }

        element.focus();
    };

    return (
        <div
            className={cn(
                'relative flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-within:ring-1 focus-within:ring-ring',
                className,
            )}
        >
            <input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={text}
                onChange={handleType}
                onBlur={handleBlur}
                placeholder={placeholder}
                maxLength={10}
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <input
                ref={pickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={value ?? ''}
                min={min ?? undefined}
                max={max ?? undefined}
                onChange={handlePickerChange}
                className="pointer-events-none absolute inset-y-0 right-0 size-px opacity-0"
            />
            <button
                type="button"
                tabIndex={-1}
                title="Pilih tanggal"
                onClick={openPicker}
                className="absolute right-1 flex shrink-0 items-center justify-center rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
                <Calendar className="h-4 w-4" />
            </button>
        </div>
    );
}
