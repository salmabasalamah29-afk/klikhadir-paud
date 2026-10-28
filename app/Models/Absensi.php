<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'siswa_id',
    'guru_id',
    'tanggal',
    'status',
    'keterangan',
    'jam_ke',
    'waktu_mulai',
    'waktu_selesai',
])]
class Absensi extends Model
{
    use SoftDeletes;

    /**
     * Get the siswa that owns the absensi.
     */
    public function siswa(): BelongsTo
    {
        return $this->belongsTo(Siswa::class);
    }

    /**
     * Get the guru that recorded the absensi.
     */
    public function guru(): BelongsTo
    {
        return $this->belongsTo(Guru::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(AbsensiPhoto::class);
    }
}
