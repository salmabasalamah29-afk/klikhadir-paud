<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

#[Fillable(['user_id', 'nip', 'nama', 'jenis_kelamin'])]
class Guru extends Model
{
    protected $appends = ['foto_url'];

    /**
     * Get the user that owns the guru.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the absensis recorded by the guru.
     */
    public function absensis(): HasMany
    {
        return $this->hasMany(Absensi::class);
    }

    /**
     * Get the kelas that the guru teaches.
     */
    public function kelas(): BelongsToMany
    {
        return $this->belongsToMany(Kelas::class, 'guru_kelas');
    }

    /**
     * Get the profile foto of the guru.
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
