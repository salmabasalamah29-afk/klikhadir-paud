<?php

namespace App\Http\Controllers\Guru;

use App\Http\Controllers\Controller;
use App\Models\GuruPresensi;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PresensiDiriController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $guruPresensis = GuruPresensi::where('user_id', $user->id)
            ->orderBy('tanggal', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'tanggal' => $p->tanggal,
                    'status' => $p->status,
                    'keterangan' => $p->keterangan,
                    'created_at' => $p->created_at,
                ];
            });

        $today = now()->toDateString();
        $todayPresensi = GuruPresensi::where('user_id', $user->id)
            ->where('tanggal', $today)
            ->first();

        return Inertia::render('guru/presensi-diri/index', [
            'guruPresensis' => $guruPresensis,
            'todayPresensi' => $todayPresensi,
            'today' => $today,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();

        $validated = $request->validate([
            'tanggal' => 'required|date',
            'status' => 'required|in:hadir,sakit,izin',
            'keterangan' => 'nullable|string|max:255',
        ], [
            'status.required' => 'Status kehadiran wajib dipilih.',
            'status.in' => 'Status harus Hadir, Sakit, atau Izin.',
        ]);

        GuruPresensi::updateOrCreate(
            [
                'user_id' => $user->id,
                'tanggal' => $validated['tanggal'],
            ],
            [
                'status' => $validated['status'],
                'keterangan' => $validated['keterangan'] ?? null,
            ]
        );

        return back()->with('success', 'Presensi diri berhasil disimpan.');
    }

    public function destroy(string $id)
    {
        $presensi = GuruPresensi::findOrFail($id);

        if ($presensi->user_id !== request()->user()->id) {
            return back()->with('error', 'Tidak berhak menghapus presensi ini.');
        }

        $presensi->delete();

        return back()->with('success', 'Presensi diri berhasil direset.');
    }
}
