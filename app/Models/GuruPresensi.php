<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'tanggal', 'status', 'keterangan'])]
class GuruPresensi extends Model
{
    /**
     * Get the user that owns the guru presensi.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
