<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('siswas', 'nis')) {
            DB::table('siswas')
                ->where(fn ($query) => $query->whereNull('nisn')->orWhere('nisn', ''))
                ->update(['nisn' => DB::raw('nis')]);
        }

        if (Schema::hasColumn('arsip_presensis', 'siswa_nis') && ! Schema::hasColumn('arsip_presensis', 'siswa_nisn')) {
            Schema::table('arsip_presensis', function (Blueprint $table) {
                $table->renameColumn('siswa_nis', 'siswa_nisn');
            });
        }

        if (Schema::hasColumn('siswas', 'nis')) {
            Schema::table('siswas', function (Blueprint $table) {
                $table->dropUnique(['nis']);
            });

            Schema::table('siswas', function (Blueprint $table) {
                $table->dropColumn('nis');
            });
        }

        Schema::table('siswas', function (Blueprint $table) {
            $table->string('nisn', 20)->nullable(false)->change();
            $table->unique('nisn');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('siswas', function (Blueprint $table) {
            $table->dropUnique(['nisn']);
        });

        Schema::table('siswas', function (Blueprint $table) {
            $table->string('nisn', 20)->nullable()->change();
            $table->string('nis', 20)->nullable()->unique()->after('kelas_id');
        });

        DB::table('siswas')->update(['nis' => DB::raw('nisn')]);

        if (Schema::hasColumn('arsip_presensis', 'siswa_nisn') && ! Schema::hasColumn('arsip_presensis', 'siswa_nis')) {
            Schema::table('arsip_presensis', function (Blueprint $table) {
                $table->renameColumn('siswa_nisn', 'siswa_nis');
            });
        }
    }
};
