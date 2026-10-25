<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\ManagesProfileFoto;
use App\Http\Controllers\Controller;
use App\Models\Guru;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class GuruController extends Controller
{
    use ManagesProfileFoto;

    public function index(Request $request)
    {
        $search = $request->input('search');

        $gurus = Guru::with(['user', 'foto'])
            ->when($search, function ($query, $search) {
                $searchTrim = trim($search);
                $query->whereLike('nama', "%{$searchTrim}%");
            })
            ->latest()
            ->paginate(11)
            ->withQueryString();

        return Inertia::render('admin/guru/index', [
            'gurus' => $gurus,
        ]);
    }

    public function show(string $id)
    {
        $guru = Guru::with(['user', 'foto'])
            ->findOrFail($id);

        return Inertia::render('admin/guru/profil', [
            'guru' => $guru,
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeFotoInput($request);

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'jenis_kelamin' => 'nullable|in:laki-laki,perempuan',
            'foto' => 'nullable|file|mimes:jpg,jpeg,png|max:5120',
        ], [
            'foto.mimes' => 'Foto harus format JPG, JPEG, atau PNG.',
            'foto.max' => 'Ukuran foto maksimal 5 MB.',
        ]);

        $username = $this->generateUsername($validated['nama']);

        DB::transaction(function () use ($request, $validated, $username) {
            $user = User::create([
                'name' => $validated['nama'],
                'username' => $username,
                'password' => Hash::make('password'),
                'password_default' => true,
                'role' => 'guru',
            ]);

            $guru = Guru::create([
                'user_id' => $user->id,
                'nama' => $validated['nama'],
                'jenis_kelamin' => $validated['jenis_kelamin'] ?? null,
            ]);

            if ($request->hasFile('foto')) {
                $this->storeFoto($guru, $request->file('foto'));
            }
        });

        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $guru = Guru::findOrFail($id);
        $this->normalizeFotoInput($request);

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'jenis_kelamin' => 'nullable|in:laki-laki,perempuan',
            'password' => 'nullable|string|min:8',
            'foto' => 'nullable|file|mimes:jpg,jpeg,png|max:5120',
            'remove_foto' => 'nullable|boolean',
        ], [
            'foto.mimes' => 'Foto harus format JPG, JPEG, atau PNG.',
            'foto.max' => 'Ukuran foto maksimal 5 MB.',
        ]);

        DB::transaction(function () use ($request, $guru, $validated) {
            $guru->update([
                'nama' => $validated['nama'],
                'jenis_kelamin' => $validated['jenis_kelamin'] ?? null,
            ]);

            $userUpdate = [
                'name' => $validated['nama'],
            ];

            if (! empty($validated['password'])) {
                $userUpdate['password'] = Hash::make($validated['password']);
            }

            $guru->user->update($userUpdate);

            if ($request->hasFile('foto')) {
                $this->replaceFoto($guru, $request->file('foto'));
            } elseif (! empty($validated['remove_foto'])) {
                $this->removeFoto($guru);
            }
        });

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $guru = Guru::findOrFail($id);
        $this->removeFoto($guru);
        $guru->user->delete();

        return redirect()->back();
    }

    private function generateUsername(string $nama): string
    {
        $baseUsername = strtolower(str_replace(' ', '', $nama));
        $username = $baseUsername;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $baseUsername.$counter++;
        }

        return $username;
    }
}
