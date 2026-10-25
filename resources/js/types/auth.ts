export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    role: 'admin' | 'guru' | 'siswa';
    guru?: {
        nama: string;
        jenis_kelamin?: 'laki-laki' | 'perempuan' | null;
        foto_url?: string | null;
    } | null;
    siswa?: {
        nama: string;
        nis?: string;
        jenis_kelamin?: 'laki-laki' | 'perempuan' | null;
        foto_url?: string | null;
        kelas?: {
            full_nama_kelas: string;
        } | null;
    } | null;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export interface SharedData {
    auth: Auth;
    [key: string]: unknown;
}

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
