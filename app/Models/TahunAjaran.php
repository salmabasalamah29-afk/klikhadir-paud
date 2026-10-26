<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tahun_awal', 'tahun_akhir', 'is_active'])]
class TahunAjaran extends Model
{
    protected $table = 'tahun_ajarans';

    protected $casts = ['is_active' => 'boolean'];

    public function arsipPresensis(): HasMany
    {
        return $this->hasMany(ArsipPresensi::class);
    }

    /**
     * Active academic year start/end (July 1 tahun_awal - June 30 tahun_akhir).
     * Live attendance (absensis) is only valid within this range; older data is in arsip.
     *
     * @return array{0:Carbon,1:Carbon}|null
     */
    public static function activeRange(): ?array
    {
        $active = static::where('is_active', true)->first();
        if (! $active) {
            return null;
        }

        try {
            $start = Carbon::create((int) $active->tahun_awal, 7, 1)->startOfDay();
            $end = Carbon::create((int) $active->tahun_akhir, 6, 30)->endOfDay();

            return [$start, $end];
        } catch (\Throwable $e) {
            return null;
        }
    }

    public static function isDateInActiveYear(?string $date): bool
    {
        if (! $date) {
            return true;
        }
        $range = static::activeRange();
        if (! $range) {
            return true;
        }
        try {
            $d = Carbon::parse($date)->startOfDay();

            return $d->between($range[0], $range[1]);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
