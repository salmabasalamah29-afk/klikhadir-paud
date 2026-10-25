import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

/**
 * Polling auto-refresh untuk Inertia.
 * - Hanya reload saat halaman visible (hemat resource)
 * - Gunakan `only` untuk partial reload (lebih ringan)
 * - `async:true` agar tidak cancel request user yang sedang spam
 */
export function useAutoRefresh(
    enabled: boolean,
    intervalMs = 5000,
    only?: string[],
): void {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inFlightRef = useRef(false);
    const onlyKey = only?.join(',') ?? '';

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const isUserTyping = (): boolean => {
            const el = document.activeElement as HTMLElement | null;

            if (!el) {
                return false;
            }

            const tag = el.tagName;

            // Hanya tahan refresh jika sedang fokus di text input atau modal terbuka yang sedang aktif diedit
            if (tag === 'TEXTAREA') {
                return true;
            }

            if (tag === 'INPUT') {
                const inputType = (el as HTMLInputElement).type;

                // Jangan block untuk button/checkbox/radio/hidden/file
                if (
                    ['text', 'search', 'email', 'number', 'password'].includes(
                        inputType,
                    )
                ) {
                    return true;
                }
            }

            // Modal terbuka (mis. upload bukti) -> jangan ganggu
            if (document.querySelector('[role="dialog"]')) {
                return true;
            }

            return false;
        };

        const doReload = (): void => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            if (inFlightRef.current) {
                return;
            }

            // Jangan refresh saat user sedang mengetik / modal terbuka:
            // ini penyebab "input belum selesai tiba-tiba refresh"
            if (isUserTyping()) {
                return;
            }

            inFlightRef.current = true;
            const opts: Record<string, unknown> = {
                preserveScroll: true,
                preserveState: true,
                preserveUrl: true,
                async: true,
                onFinish: () => {
                    inFlightRef.current = false;
                },
            };

            if (onlyKey) {
                opts.only = onlyKey.split(',');
            }

            (
                router.reload as unknown as (
                    opts: Record<string, unknown>,
                ) => void
            )(opts);
            // Safety: anggap selesai max 10 detik agar tidak macet selamanya
            setTimeout(() => {
                inFlightRef.current = false;
            }, 10000);
        };

        intervalRef.current = setInterval(doReload, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            inFlightRef.current = false;
        };
    }, [enabled, intervalMs, onlyKey]);
}
