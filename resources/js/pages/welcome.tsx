import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

export default function Welcome() {
    return (
        <>
            <Head title="Selamat Datang - KlikHadir" />
            <div
                className="relative flex min-h-screen flex-col items-center justify-center p-6 lg:p-8 overflow-hidden"
                style={{ backgroundColor: '#093ff9', fontFamily: "'Poppins', sans-serif" }}
            >
                {/* Wave background */}
                <svg
                    className="absolute bottom-0 left-0 right-0 w-full"
                    viewBox="0 0 1440 320"
                    preserveAspectRatio="none"
                >
                    <path
                        fill="#3864f9"
                        d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,224C840,245,960,267,1080,261.3C1200,256,1320,224,1380,208L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
                    />
                    <path
                        fill="#3864f9"
                        d="M0,96L80,117.3C160,139,320,181,480,186.7C640,192,800,160,960,149.3C1120,139,1280,149,1360,154.7L1440,160L1440,320L0,320Z"
                        opacity="0.4"
                    />
                </svg>

                {/* Brand */}
                <div className="relative z-10 mb-10 flex items-center gap-3">
                    <span className="text-3xl font-bold tracking-tight text-white">
                        Selamat datang pengguna
                    </span>
                </div>

                {/* Portal Card */}
                <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_16px_48px_0_rgba(0,0,0,0.35)]">
                    {/* Card Header */}
                    <div className="mb-7 text-center">
                        <h1 className="text-2xl font-bold text-[#093ff9]">
                            Panel Login
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">
                            Masuk kedalam presensi KlikHadir
                        </p>
                    </div>

                    {/* Login Form */}
                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                    >
                        {({ processing, errors }) => (
                            <div className="grid gap-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="login" className="text-sm font-medium text-[#093ff9]">
                                        Username / NIS / Email
                                    </Label>
                                    <Input
                                        id="login"
                                        type="text"
                                        name="login"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="username"
                                        placeholder="Masukkan Username / NIS / Email"
                                        className="h-11 border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#093ff9] focus:ring-[#093ff9]/20"
                                    />
                                    <InputError message={errors.login} />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="password" className="text-sm font-medium text-[#093ff9]">
                                        Kata Sandi
                                    </Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Masukkan Kata Sandi"
                                        className="h-11 border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#093ff9] focus:ring-[#093ff9]/20"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <Button
                                    type="submit"
                                    tabIndex={3}
                                    disabled={processing}
                                    data-test="login-button"
                                    className="mt-2 h-11 w-full bg-[#093ff9] text-base font-semibold text-white shadow-[0_4px_14px_0_rgba(9,63,249,0.4)] transition-all duration-300 hover:bg-[#0730c8] hover:shadow-[0_6px_20px_rgba(9,63,249,0.35)]"
                                >
                                    {processing ? (
                                        <><Spinner className="mr-2" /> Memproses...</>
                                    ) : (
                                        'Masuk'
                                    )}
                                </Button>
                            </div>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}
