<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['nama_kelas'])]
class Kelas extends Model
{
    protected $appends = ['full_nama_kelas'];

    /**
     * Get the full name of the kelas.
     */
    protected function getFullNamaKelasAttribute(): string
    {
        $parts = [];
        if ($this->nama_kelas) {
            $parts[] = $this->nama_kelas;
        }

        return implode(' ', $parts);
    }

    /**
     * Get the siswas for the kelas.
     */
    public function siswas(): HasMany
    {
        return $this->hasMany(Siswa::class);
    }

    /**
     * Get the gurus assigned to the kelas.
     */
    public function gurus(): BelongsToMany
    {
        return $this->belongsToMany(Guru::class, 'guru_kelas');
    }
}
