<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\ManagesProfileFoto;
use App\Http\Controllers\Controller;
use App\Models\Kelas;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SiswaController extends Controller
{
    use ManagesProfileFoto;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $kelasId = $request->input('kelas_id');

        $siswas = Siswa::with(['user', 'foto', 'kelas'])
            ->where('is_alumni', false)
            ->when($kelasId, fn ($q) => $q->where('kelas_id', $kelasId))
            ->when($search, function ($query, $search) {
                $searchTrim = trim($search);

                $query->where(function ($q) use ($searchTrim) {
                    $q->whereLike('nama', "%{$searchTrim}%")
                        ->orWhereLike('nisn', "%{$searchTrim}%")
                        ->orWhereHas('kelas', function ($kq) use ($searchTrim) {
                            $kq->whereLike('nama_kelas', "%{$searchTrim}%");
                        });
                });
            })
            ->orderBy('nisn', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/siswa/index', [
            'siswas' => $siswas,
            'kelasList' => Kelas::orderBy('nama_kelas')->get(),
            'filters' => ['search' => $search, 'kelas_id' => $kelasId],
        ]);
    }

    public function show(string $id)
    {
        $siswa = Siswa::with(['user', 'foto', 'kelas'])
            ->findOrFail($id);

        return Inertia::render('admin/siswa/profil', [
            'siswa' => $siswa,
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeFotoInput($request);

        $validated = $request->validate([
            'nisn' => ['required', 'string', 'max:20', 'unique:siswas,nisn', 'unique:users,username'],
            'nik' => 'nullable|string|max:20',
            'nama' => 'required|string|max:255',
            'nama_panggilan' => 'nullable|string|max:100',
            'jenis_kelamin' => 'nullable|in:laki-laki,perempuan',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'agama' => 'nullable|string|max:50',
            'tanggal_masuk' => 'nullable|date',
            'nama_ayah' => 'nullable|string|max:100',
            'pekerjaan_ayah' => 'nullable|string|max:100',
            'nama_ibu' => 'nullable|string|max:100',
            'pekerjaan_ibu' => 'nullable|string|max:100',
            'no_hp' => 'nullable|string|max:20',
            'anak_ke' => 'nullable|string|max:10',
            'nama_jalan' => 'nullable|string|max:100',
            'desa' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kabupaten_kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'kode_pos' => 'nullable|string|max:10',
            'kelas_id' => 'required|exists:kelas,id',
            'foto' => 'nullable|file|mimes:jpg,jpeg,png|max:5120',
        ], [
            'nisn.required' => 'NISN wajib diisi.',
            'nisn.unique' => 'NISN sudah digunakan.',
            'foto.mimes' => 'Foto harus format JPG, JPEG, atau PNG.',
            'foto.max' => 'Ukuran foto maksimal 5 MB.',
        ]);

        $user = User::create([
            'name' => $validated['nama'],
            'username' => $validated['nisn'],
            'password' => Hash::make('password'),
            'password_default' => true,
            'role' => 'siswa',
        ]);

        $siswa = Siswa::create([
            'user_id' => $user->id,
            'kelas_id' => $validated['kelas_id'],
            'nisn' => $validated['nisn'],
            'nik' => $validated['nik'] ?? null,
            'nama' => $validated['nama'],
            'nama_panggilan' => $validated['nama_panggilan'] ?? null,
            'jenis_kelamin' => $validated['jenis_kelamin'] ?? null,
            'tempat_lahir' => $validated['tempat_lahir'] ?? null,
            'tanggal_lahir' => $validated['tanggal_lahir'] ?? null,
            'agama' => $validated['agama'] ?? null,
            'tanggal_masuk' => $validated['tanggal_masuk'] ?? null,
            'nama_ayah' => $validated['nama_ayah'] ?? null,
            'pekerjaan_ayah' => $validated['pekerjaan_ayah'] ?? null,
            'nama_ibu' => $validated['nama_ibu'] ?? null,
            'pekerjaan_ibu' => $validated['pekerjaan_ibu'] ?? null,
            'no_hp' => $validated['no_hp'] ?? null,
            'anak_ke' => $validated['anak_ke'] ?? null,
            'nama_jalan' => $validated['nama_jalan'] ?? null,
            'desa' => $validated['desa'] ?? null,
            'kecamatan' => $validated['kecamatan'] ?? null,
            'kabupaten_kota' => $validated['kabupaten_kota'] ?? null,
            'provinsi' => $validated['provinsi'] ?? null,
            'kode_pos' => $validated['kode_pos'] ?? null,
        ]);

        if ($request->hasFile('foto')) {
            $this->storeFoto($siswa, $request->file('foto'));
        }

        return redirect()->back();
    }

    public function update(Request $request, string $id)
    {
        $siswa = Siswa::findOrFail($id);
        $this->normalizeFotoInput($request);

        $validated = $request->validate([
            'nisn' => [
                'required',
                'string',
                'max:20',
                Rule::unique('siswas', 'nisn')->ignore($siswa->id),
                Rule::unique('users', 'username')->ignore($siswa->user_id),
            ],
            'nik' => 'nullable|string|max:20',
            'nama' => 'required|string|max:255',
            'nama_panggilan' => 'nullable|string|max:100',
            'jenis_kelamin' => 'nullable|in:laki-laki,perempuan',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'agama' => 'nullable|string|max:50',
            'tanggal_masuk' => 'nullable|date',
            'nama_ayah' => 'nullable|string|max:100',
            'pekerjaan_ayah' => 'nullable|string|max:100',
            'nama_ibu' => 'nullable|string|max:100',
            'pekerjaan_ibu' => 'nullable|string|max:100',
            'no_hp' => 'nullable|string|max:20',
            'anak_ke' => 'nullable|string|max:10',
            'nama_jalan' => 'nullable|string|max:100',
            'desa' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kabupaten_kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'kode_pos' => 'nullable|string|max:10',
            'kelas_id' => 'required|exists:kelas,id',
            'password' => 'nullable|string|min:8',
            'foto' => 'nullable|file|mimes:jpg,jpeg,png|max:5120',
            'remove_foto' => 'nullable|boolean',
        ], [
            'nisn.required' => 'NISN wajib diisi.',
            'nisn.unique' => 'NISN sudah digunakan.',
            'foto.mimes' => 'Foto harus format JPG, JPEG, atau PNG.',
            'foto.max' => 'Ukuran foto maksimal 5 MB.',
        ]);

        $siswa->update([
            'nisn' => $validated['nisn'],
            'nik' => $validated['nik'] ?? null,
            'nama' => $validated['nama'],
            'nama_panggilan' => $validated['nama_panggilan'] ?? null,
            'kelas_id' => $validated['kelas_id'],
            'jenis_kelamin' => $validated['jenis_kelamin'] ?? null,
            'tempat_lahir' => $validated['tempat_lahir'] ?? null,
            'tanggal_lahir' => $validated['tanggal_lahir'] ?? null,
            'agama' => $validated['agama'] ?? null,
            'tanggal_masuk' => $validated['tanggal_masuk'] ?? null,
            'nama_ayah' => $validated['nama_ayah'] ?? null,
            'pekerjaan_ayah' => $validated['pekerjaan_ayah'] ?? null,
            'nama_ibu' => $validated['nama_ibu'] ?? null,
            'pekerjaan_ibu' => $validated['pekerjaan_ibu'] ?? null,
            'no_hp' => $validated['no_hp'] ?? null,
            'anak_ke' => $validated['anak_ke'] ?? null,
            'nama_jalan' => $validated['nama_jalan'] ?? null,
            'desa' => $validated['desa'] ?? null,
            'kecamatan' => $validated['kecamatan'] ?? null,
            'kabupaten_kota' => $validated['kabupaten_kota'] ?? null,
            'provinsi' => $validated['provinsi'] ?? null,
            'kode_pos' => $validated['kode_pos'] ?? null,
        ]);

        $userUpdate = [
            'name' => $validated['nama'],
            'username' => $validated['nisn'],
        ];

        if (! empty($validated['password'])) {
            $userUpdate['password'] = Hash::make($validated['password']);
        }

        $siswa->user->update($userUpdate);

        if ($request->hasFile('foto')) {
            $this->replaceFoto($siswa, $request->file('foto'));
        } elseif (! empty($validated['remove_foto'])) {
            $this->removeFoto($siswa);
        }

        return redirect()->back();
    }

    public function destroy(string $id)
    {
        $siswa = Siswa::findOrFail($id);
        $this->removeFoto($siswa);
        $siswa->user->delete();

        return redirect()->back();
    }
}
