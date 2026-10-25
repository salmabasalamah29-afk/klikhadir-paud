<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfilController extends Controller
{
    /**
     * Show the profile page of the currently authenticated guru/siswa.
     */
    public function show(Request $request): Response
    {
        $user = $request->user();

        if ($user->role === 'guru') {
            $guru = $user->guru()
                ->with(['foto', 'kelas', 'user'])
                ->firstOrFail();

            return Inertia::render('guru/profil', [
                'profil' => $guru,
            ]);
        }

        $siswa = $user->siswa()
            ->with(['foto', 'kelas'])
            ->firstOrFail();

        return Inertia::render('siswa/profil', [
            'profil' => $siswa,
        ]);
    }
}
