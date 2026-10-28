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
        DB::table('arsip_presensis')
            ->whereIn('status', ['alpha', 'dispensasi'])
            ->update(['status' => 'izin']);

        DB::table('absensis')
            ->whereIn('status', ['alpha', 'dispensasi'])
            ->update(['status' => 'izin']);

        Schema::table('arsip_presensis', function (Blueprint $table) {
            if (Schema::hasColumn('arsip_presensis', 'bukti')) {
                $table->dropColumn('bukti');
            }
        });

        Schema::table('absensis', function (Blueprint $table) {
            if (Schema::hasColumn('absensis', 'bukti')) {
                $table->dropColumn('bukti');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE arsip_presensis MODIFY status ENUM('hadir', 'sakit', 'izin') NOT NULL DEFAULT 'hadir'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('arsip_presensis', function (Blueprint $table) {
            if (! Schema::hasColumn('arsip_presensis', 'bukti')) {
                $table->string('bukti')->nullable();
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE arsip_presensis MODIFY status ENUM('hadir', 'sakit', 'izin', 'alpha', 'dispensasi') NOT NULL DEFAULT 'hadir'");
        }
    }
};
