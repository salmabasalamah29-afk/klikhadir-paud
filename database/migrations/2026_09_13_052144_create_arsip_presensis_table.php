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
        Schema::create('arsip_presensis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tahun_ajaran_id')->constrained('tahun_ajarans')->onDelete('cascade');
            $table->foreignId('siswa_id')->constrained('siswas')->onDelete('cascade');
            $table->foreignId('kelas_id')->constrained('kelas')->onDelete('cascade');
            $table->foreignId('guru_id')->constrained('gurus')->onDelete('cascade');
            $table->date('tanggal');
            $table->string('jam_ke')->nullable();
            $table->enum('status', ['hadir', 'sakit', 'izin', 'alpha', 'dispensasi'])->default('hadir');
            $table->text('keterangan')->nullable();
            $table->string('bukti')->nullable();
            $table->boolean('is_alumni')->default(false);
            $table->string('siswa_nis', 20)->nullable();
            $table->string('siswa_nama')->nullable();
            $table->string('siswa_foto_url')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('arsip_presensis');
    }
};
