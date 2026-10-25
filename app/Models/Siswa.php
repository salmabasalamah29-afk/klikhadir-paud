<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

#[Fillable(['user_id', 'kelas_id', 'nis', 'nisn', 'nik', 'nama', 'nama_panggilan', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'agama', 'tanggal_masuk', 'nama_ayah', 'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'no_hp', 'anak_ke', 'nama_jalan', 'desa', 'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos', 'is_alumni'])]
class Siswa extends Model
{
    protected $appends = ['foto_url'];

    /**
     * Get the user that owns the siswa.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the kelas that owns the siswa.
     */
    public function kelas(): BelongsTo
    {
        return $this->belongsTo(Kelas::class);
    }

    /**
     * Get the absensis for the siswa.
     */
    public function absensis(): HasMany
    {
        return $this->hasMany(Absensi::class);
    }

    /**
     * Get the profile foto of the siswa.
     */
    public function foto(): MorphOne
    {
        return $this->morphOne(Foto::class, 'fotoable');
    }

    /**
     * Get the generated public URL of the profile foto.
     */
    public function fotoUrl(): Attribute
    {
        return Attribute::get(function (): ?string {
            if (! $this->relationLoaded('foto')) {
                return null;
            }

            return $this->foto?->file_path
                ? '/storage/'.ltrim($this->foto->file_path, '/')
                : null;
        });
    }
}
