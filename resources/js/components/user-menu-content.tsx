import { Link, router } from '@inertiajs/react';
import { CircleUserRound, LogOut } from 'lucide-react';
import {
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { profil as guruProfil } from '@/routes/guru';
import { profil as siswaProfil } from '@/routes/siswa';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    const profileHref =
        user.role === 'guru'
            ? guruProfil.url()
            : user.role === 'siswa'
              ? siswaProfil.url()
              : null;

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={user.role === 'admin'} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profileHref && (
                <>
                    <DropdownMenuItem asChild>
                        <Link href={profileHref} className="block w-full cursor-pointer">
                            <CircleUserRound className="mr-2" />
                            Profil
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                </>
            )}
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
