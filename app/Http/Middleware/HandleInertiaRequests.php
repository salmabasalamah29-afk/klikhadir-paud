<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        if ($user) {
            if ($user->role === 'guru') {
                $user->load('guru.foto');
            } elseif ($user->role === 'siswa') {
                $user->load(['siswa.foto', 'siswa.kelas']);
            }

            $user->setAttribute('avatar', $this->profileAvatar($user));
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => fn () => $request->session()->get('success') ?? Inertia::getFlashed($request)['success'] ?? null,
                'error' => fn () => $request->session()->get('error') ?? Inertia::getFlashed($request)['error'] ?? null,
                'import_errors' => fn () => $request->session()->get('import_errors') ?? Inertia::getFlashed($request)['import_errors'] ?? null,
                'toast' => fn () => Inertia::getFlashed($request)['toast'] ?? $request->session()->get('toast'),
            ],
            'success' => fn () => $request->session()->get('success'),
            'error' => fn () => $request->session()->get('error'),
            'import_errors' => fn () => $request->session()->get('import_errors'),
        ];
    }

    /**
     * Derive the profile foto URL of the authenticated user from the linked
     * guru/siswa record, falling back to the stored avatar column.
     */
    protected function profileAvatar(User $user): ?string
    {
        return match ($user->role) {
            'guru' => $user->guru?->foto_url,
            'siswa' => $user->siswa?->foto_url,
            default => $user->avatar,
        };
    }
}
