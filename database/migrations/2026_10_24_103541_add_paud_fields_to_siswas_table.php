<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('siswas', function (Blueprint $table) {
            $table->string('nisn', 20)->nullable()->after('nis');
            $table->string('nik', 20)->nullable()->after('nisn');
            $table->string('nama_panggilan', 100)->nullable()->after('nama');
            $table->string('tempat_lahir', 100)->nullable()->after('nama_panggilan');
            $table->date('tanggal_lahir')->nullable()->after('tempat_lahir');
            $table->string('agama', 50)->nullable()->after('tanggal_lahir');
            $table->date('tanggal_masuk')->nullable()->after('agama');
            $table->string('nama_ayah', 100)->nullable()->after('tanggal_masuk');
            $table->string('pekerjaan_ayah', 100)->nullable()->after('nama_ayah');
            $table->string('nama_ibu', 100)->nullable()->after('pekerjaan_ayah');
            $table->string('pekerjaan_ibu', 100)->nullable()->after('nama_ibu');
            $table->string('no_hp', 20)->nullable()->after('pekerjaan_ibu');
            $table->string('anak_ke', 10)->nullable()->after('no_hp');
            $table->string('nama_jalan', 100)->nullable()->after('anak_ke');
            $table->string('desa', 100)->nullable()->after('nama_jalan');
            $table->string('kecamatan', 100)->nullable()->after('desa');
            $table->string('kabupaten_kota', 100)->nullable()->after('kecamatan');
            $table->string('provinsi', 100)->nullable()->after('kabupaten_kota');
            $table->string('kode_pos', 10)->nullable()->after('provinsi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('siswas', function (Blueprint $table) {
            $table->dropColumn([
                'nisn', 'nik', 'nama_panggilan', 'tempat_lahir', 'tanggal_lahir',
                'agama', 'tanggal_masuk', 'nama_ayah', 'pekerjaan_ayah', 'nama_ibu',
                'pekerjaan_ibu', 'no_hp', 'anak_ke', 'nama_jalan', 'desa', 'kecamatan',
                'kabupaten_kota', 'provinsi', 'kode_pos',
            ]);
        });
    }
};
