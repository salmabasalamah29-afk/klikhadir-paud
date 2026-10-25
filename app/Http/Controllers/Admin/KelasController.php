<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kelas;
use Illuminate\Http\Request;
use Inertia\Inertia;

class KelasController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');

        $kelasQuery = Kelas::orderBy('id', 'asc');

        if ($search) {
            $searchTrim = trim($search);

            $kelasQuery->where(function ($q) use ($searchTrim) {
                $q->orWhereLike('nama_kelas', "%{$searchTrim}%");
            });
        }

        return Inertia::render('admin/kelas/index', [
            'kelas' => $kelasQuery->paginate(10)->withQueryString(),
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_kelas' => 'nullable|string|max:255',
        ]);

        if (isset($validated['nama_kelas']) && trim($validated['nama_kelas']) === '') {
            $validated['nama_kelas'] = null;
        }

        Kelas::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $kelas = Kelas::findOrFail($id);

        $validated = $request->validate([
            'nama_kelas' => 'nullable|string|max:255',
        ]);

        if (isset($validated['nama_kelas']) && trim($validated['nama_kelas']) === '') {
            $validated['nama_kelas'] = null;
        }

        $kelas->update($validated);

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        Kelas::findOrFail($id)->delete();

        return redirect()->back();
    }
}
