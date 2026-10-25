import { usePage, Link } from '@inertiajs/react';
import { BookOpen, LayoutGrid, Users, UserCircle, GraduationCap, School, ClipboardList, History, ListOrdered, Clock, KeyRound, FileSpreadsheet, Calendar, ShieldCheck } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    useSidebar,
} from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import admin from '@/routes/admin';
import adminTahunAjaran from '@/routes/admin/tahun-ajaran';
import { profil as guruProfil } from '@/routes/guru';
import guruRoutes from '@/routes/guru/absensi';
import absensiData from '@/routes/guru/data-absensi';
import guruPresensiDiri from '@/routes/guru/presensi-diri';
import guruLihatPresensi from '@/routes/guru/lihat-presensi';
import exportAbsensi from '@/routes/guru/export';
import guruPassword from '@/routes/guru/password';
import { dashboard as siswaDashboard } from '@/routes/siswa';
import { profil as siswaProfil } from '@/routes/siswa';
import siswaPassword from '@/routes/siswa/password';
import type { NavItem, SharedData } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const { isMobile, openMobile, setOpenMobile } = useSidebar();
    const { isCurrentUrl } = useCurrentUrl();
    const userRole = auth.user.role;
    const getInitials = useInitials();

    const profileHref =
        userRole === 'guru'
            ? guruProfil.url()
            : userRole === 'siswa'
              ? siswaProfil.url()
              : null;

    let mainNavItems: NavItem[] = [];
    let platformLabel = 'Menu';
    if (userRole === 'admin') {
        platformLabel = 'Menu';
    } else if (userRole === 'guru') {
        platformLabel = 'Menu';
    } else if (userRole === 'siswa') {
        platformLabel = 'Menu';
    }

    if (userRole === 'admin') {
        mainNavItems = [
            {
                title: 'Dasbor',
                href: admin.dashboard.url(),
                icon: LayoutGrid,
            },
            {
                title: 'Tahun Ajaran',
                href: adminTahunAjaran.index.url(),
                icon: Calendar,
            },
            {
                title: 'Kelas',
                href: admin.kelas.index.url(),
                icon: GraduationCap,
            },
            {
                title: 'Guru',
                href: admin.guru.index.url(),
                icon: Users,
            },
            {
                title: 'Murid',
                href: admin.siswa.index.url(),
                icon: UserCircle,
            },
            {
                title: 'Admin',
                href: admin.tambahAdmin.url(),
                icon: ShieldCheck,
            },
            {
                title: 'Alumni',
                href: '/admin/alumni',
                icon: GraduationCap,
            },
        ];
    } else if (userRole === 'guru') {
        mainNavItems = [
            {
                title: 'Presensi Siswa',
                href: guruRoutes.index.url(),
                icon: ClipboardList,
            },
            {
                title: 'Presensi Guru',
                href: guruPresensiDiri.index.url(),
                icon: Clock,
            },
            {
                title: 'Lihat Presensi Siswa',
                href: guruLihatPresensi.index.url(),
                icon: BookOpen,
            },
            {
                title: 'Ekspor Presensi Siswa',
                href: exportAbsensi.index.url(),
                icon: FileSpreadsheet,
            },
            {
                title: 'Ubah Sandi',
                href: guruPassword.change.url(),
                icon: KeyRound,
            },
        ];
    } else if (userRole === 'siswa') {
        mainNavItems = [
            {
                title: 'Riwayat Presensi',
                href: siswaDashboard.url(),
                icon: History,
            },
            {
                title: 'Ubah Sandi',
                href: siswaPassword.change.url(),
                icon: KeyRound,
            },
        ];
    }



    return (
        <>
            <Sidebar collapsible="icon" variant="inset">
                <SidebarHeader className="flex h-12 shrink-0 items-center p-2 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 group-has-data-[collapsible=icon]/sidebar-wrapper:p-2">
                    {/* Geometri disamakan dengan tombol menu (SidebarGroup p-2 > MenuButton h-8 px-2):
                        ikon 22px + gap 6px = 28px, sama seperti ikon menu 20px + gap 8px —
                        jadi ikon sedikit lebih besar tapi teks tetap di x=44px sejajar menu. Tinggi h-12 sejajar header breadcrumb kanan. */}
                    <div className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                        <img
                            src="/android-chrome-192x192.png"
                            alt="Klikhadir"
                            className="size-[22px] shrink-0 group-data-[collapsible=icon]:hidden"
                        />
                        <span className="truncate text-sm font-bold text-blue-700 dark:text-blue-400 group-data-[collapsible=icon]:hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
                            Klikhadir.
                        </span>
                        {/* Collapsed sidebar logo - shows only when sidebar is collapsed, matches nav icon size */}
                        <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-8 items-center justify-center mx-auto">
                            <img
                                src="/android-chrome-192x192.png"
                                alt="Klikhadir"
                                className="size-[22px]"
                            />
                        </div>
                    </div>
                </SidebarHeader>

                <SidebarContent>
                    <NavMain items={mainNavItems} label={platformLabel} />
                </SidebarContent>

                <SidebarFooter>
                    {/* <NavFooter items={footerNavItems} className="mt-auto" /> */}
                    <NavUser />
                </SidebarFooter>
            </Sidebar>

            {/* Mobile: ketika tertutup, hanya gambar/icon aja yang tampil — tulisannya disembunyikan, semua ditaruh di tengah. */}
            {isMobile && !openMobile && (
                <div className="fixed inset-y-0 left-0 z-30 flex w-[3rem] flex-col items-center bg-sidebar pt-6 md:hidden">
                    <div className="w-full flex items-center justify-center pb-4">
                        <img
                            src="/android-chrome-192x192.png"
                            alt="Klikhadir"
                            className="w-5 h-5"
                        />
                    </div>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setOpenMobile(true)}
                                className="flex size-9 translate-x-[1px] items-center justify-center rounded-md transition-colors hover:bg-accent"
                                aria-label="Buka sidebar"
                            >
                                <span className="text-2xl">≡</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center" sideOffset={10} className="bg-card text-card-foreground border border-sidebar-border/70 shadow-xl">
                            Buka sidebar
                        </TooltipContent>
                    </Tooltip>

                    {/* Platform icons kecil — tetap tampil di mobile biar tidak hilang saat layar dikecilkan, hover langsung keliatan tanpa jeda + mengambang */}
                    <div className="mt-6 flex flex-1 flex-col items-center gap-1">
                        {mainNavItems.map((item) => {
                            const active = isCurrentUrl(item.href);
                            return (
                                <Tooltip key={item.title} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            prefetch
                                            aria-label={item.title}
                                            className={cn(
                                                'flex size-9 translate-x-[1px] items-center justify-center rounded-md transition-colors',
                                                active
                                                    ? 'bg-[#002399] text-white shadow-[0_6px_16px_rgba(0,35,153,0.35)]'
                                                    : 'text-sidebar-foreground hover:bg-accent hover:text-accent-foreground'
                                            )}
                                        >
                                            {item.icon && <item.icon className="size-5 shrink-0" />}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" align="center" sideOffset={10} className="bg-card text-card-foreground border border-sidebar-border/70 shadow-xl">
                                        {item.title}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>

                    {/* Bawah — hanya inisial/avatar, tanpa teks, di tengah — langsung bisa logout (klik) + hover langsung keliatan */}
                    <div className="mt-auto flex flex-col items-center gap-2">
                        <Tooltip delayDuration={0}>
                            <DropdownMenu>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="flex size-9 translate-x-[1px] items-center justify-center rounded-md hover:bg-accent transition-colors"
                                            aria-label="Akun"
                                        >
                                            <Avatar className="size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20">
                                                <AvatarImage src={auth.user?.avatar} alt={auth.user?.name} />
                                                <AvatarFallback className="bg-white text-[#002399] dark:bg-white dark:text-[#002399] text-xs font-semibold">
                                                    {getInitials(auth.user?.name ?? '')}
                                                </AvatarFallback>
                                            </Avatar>
                                        </button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <DropdownMenuContent className="w-56 rounded-lg" side="right" align="end" sideOffset={8}>
                                    <UserMenuContent user={auth.user} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <TooltipContent side="right" align="center" sideOffset={10} className="bg-card text-card-foreground border border-sidebar-border/70 shadow-xl">
                                {auth.user.name}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}
            {/* Spacer untuk konten agar tidak tertutup bar mini di mobile saat tertutup */}
            {isMobile && !openMobile && (
                <div className="w-[3rem] shrink-0 md:hidden" aria-hidden />
            )}
        </>
    );
}
