<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guru;
use App\Models\TeacherAbsensi;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GuruAbsensiRekapController extends Controller
{
    public function index(Request $request)
    {
        $gurus = Guru::orderBy('nama')->get();

        $guruId = $request->query('guru_id');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $rekap = [];

        if ($guruId) {
            $query = TeacherAbsensi::with('guru')
                ->where('guru_id', $guruId);

            if ($startDate) {
                $query->where('tanggal', '>=', $startDate);
            }
            if ($endDate) {
                $query->where('tanggal', '<=', $endDate);
            }

            $rekap = $query->orderBy('tanggal', 'desc')->get()->map(function ($item) {
                return [
                    'id' => $item->id,
                    'tanggal' => $item->tanggal,
                    'status' => $item->status,
                    'keterangan' => $item->keterangan,
                    'guru_id' => $item->guru_id,
                    'guru_nama' => $item->guru->nama,
                ];
            });
        }

        return Inertia::render('admin/guru-absensi-rekap', [
            'gurus' => $gurus->map(fn ($g) => [
                'id' => $g->id,
                'nama' => $g->nama,
            ]),
            'filters' => [
                'guru_id' => $guruId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'rekap' => $rekap,
        ]);
    }
}
