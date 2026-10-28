<?php

namespace App\Http\Controllers\Siswa;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $siswa = $request->user()->siswa;

        if (! $siswa) {
            return redirect()->route('home')->with('error', 'Profil Siswa tidak ditemukan.');
        }

        $stats = [
            'hadir' => $siswa->absensis()->where('status', 'hadir')->count(),
            'sakit' => $siswa->absensis()->where('status', 'sakit')->count(),
            'izin' => $siswa->absensis()->where('status', 'izin')->count(),
        ];

        $rawHistory = $siswa->absensis()->orderBy('updated_at', 'desc')->orderBy('id', 'desc')->get();
        // Per hari per siswa satu data terbaru seperti di lihat presensi (jangan double tiap guru absen 1 data)
        $history = $rawHistory->groupBy('tanggal')->map(function ($group) {
            $sorted = $group->sort(function ($a, $b) {
                $ta = $a->updated_at ? $a->updated_at->getTimestamp() : 0;
                $tb = $b->updated_at ? $b->updated_at->getTimestamp() : 0;
                if ($ta === $tb) {
                    return $b->id <=> $a->id;
                }

                return $tb <=> $ta;
            })->values();
            $berhalangan = $sorted->first(fn ($it) => in_array($it->status, ['sakit', 'izin'], true));

            return $berhalangan ?? $sorted->first();
        })->filter()->sortByDesc('tanggal')->values()->all();

        $siswa->load(['kelas', 'foto']);

        return Inertia::render('siswa/dashboard', [
            'siswa' => $siswa,
            'stats' => $stats,
            'history' => $history,
            'passwordDefault' => $request->user()->password_default,
        ]);
    }
}
