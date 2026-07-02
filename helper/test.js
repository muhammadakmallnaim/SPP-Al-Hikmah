const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');

// 1. Mock Electron untuk testing tanpa membuka UI
const handlers = {};
const mockElectron = {
    ipcMain: {
        handle: (channel, callback) => {
            handlers[channel] = callback;
        }
    },
    shell: {
        openPath: () => {}
    },
    dialog: {
        showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
        showSaveDialog: async () => ({ canceled: true })
    }
};

// Hack: Memaksa require('electron') mengembalikan mock kita
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
    if (request === 'electron') return mockElectron;
    return originalRequire.apply(this, arguments);
};

// 2. Import Semua Module yang akan dites
const { getDB } = require('../main/database/db');
const { registerLoggerHandlers } = require('../main/logger');

require('../src/ipc/userHandler')();
require('../src/ipc/siswaHandler')();
require('../src/ipc/kelasHandler')();
require('../src/ipc/tahunAjaranHandler')();
require('../src/ipc/pengaturanSPPHandler')();
require('../src/ipc/pembayaranHandler')();
require('../src/ipc/laporanHandler')();
require('../src/ipc/dashboardHandler')();
registerLoggerHandlers();

async function runTests() {
    console.log("=== MEMULAI COMPREHENSIVE UNIT TESTING ===");
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`[PASS] ${name}`);
            passed++;
        } catch (e) {
            console.error(`[FAIL] ${name}`);
            console.error(e);
            failed++;
        }
    };

    const db = await getDB();

    // -- INIT CLEANUP SEBELUM TEST --
    await db.run("DELETE FROM kelas WHERE nama_kelas LIKE 'TEST_%'");
    await db.run("DELETE FROM tahun_ajaran WHERE nama_tahun_ajaran LIKE 'TEST_%'");
    await db.run("DELETE FROM siswa WHERE nis LIKE 'TEST_%'");

    // === MODUL KELAS ===
    let kelasId;
    await test("Modul Kelas: Bisa Tambah Kelas", async () => {
        const res = await handlers['add-kelas'](null, { nama_kelas: 'TEST_KELAS_A', tingkat: 10, wali_kelas: '-' });
        assert.strictEqual(res.success, true);
    });
    
    await test("Modul Kelas: Bisa Baca Kelas", async () => {
        const res = await handlers['get-kelas']();
        assert.strictEqual(res.success, true);
        const kelas = res.data.find(k => k.nama_kelas === 'TEST_KELAS_A');
        assert.ok(kelas, "Kelas yang dibuat tidak ditemukan");
        kelasId = kelas.id;
    });

    await test("Modul Kelas: Bisa Edit Kelas", async () => {
        const res = await handlers['update-kelas'](null, { id: kelasId, nama_kelas: 'TEST_KELAS_B', tingkat: 10, wali_kelas: '-' });
        assert.strictEqual(res.success, true);
        const resGet = await handlers['get-kelas']();
        const kelas = resGet.data.find(k => k.id === kelasId);
        assert.strictEqual(kelas.nama_kelas, 'TEST_KELAS_B');
    });

    // === MODUL TAHUN AJARAN ===
    let tahunId;
    await test("Modul Tahun Ajaran: Bisa Tambah", async () => {
        const res = await handlers['add-tahun-ajaran'](null, { nama_tahun_ajaran: 'TEST_2099/2100', semester: 'Ganjil', status_aktif: 1 });
        assert.strictEqual(res.success, true);
    });
    
    await test("Modul Tahun Ajaran: Bisa Baca", async () => {
        const res = await handlers['get-tahun-ajaran']();
        const thn = res.data.find(t => t.nama_tahun_ajaran === 'TEST_2099/2100');
        assert.ok(thn);
        tahunId = thn.id;
    });

    // === MODUL SISWA ===
    let siswaId;
    await test("Modul Siswa: Bisa Tambah Siswa", async () => {
        const res = await handlers['add-siswa'](null, {
            nis: 'TEST_999999',
            nisn: 'TEST_999999',
            nama_siswa: 'Siswa Uji Coba',
            kelas_id: kelasId,
            jenis_kelamin: 'L',
            tempat_lahir: 'Jakarta',
            tanggal_lahir: '2010-01-01',
            alamat: 'Jl. Testing',
            nama_orang_tua: 'Bapak Test',
            no_hp_orang_tua: '08123456789',
            tahun_masuk: 2026,
            status: 'aktif'
        });
        assert.strictEqual(res.success, true);
    });
    
    await test("Modul Siswa: Bisa Baca Siswa", async () => {
        const res = await handlers['get-siswa']();
        const siswa = res.data.find(s => s.nis === 'TEST_999999');
        assert.ok(siswa);
        siswaId = siswa.id;
    });
    
    await test("Modul Siswa: Bisa Edit Siswa", async () => {
        const res = await handlers['update-siswa'](null, {
            id: siswaId,
            nis: 'TEST_999999',
            nisn: 'TEST_999999',
            nama_siswa: 'Siswa Uji Coba Edit',
            kelas_id: kelasId,
            jenis_kelamin: 'L',
            tempat_lahir: 'Jakarta',
            tanggal_lahir: '2010-01-01',
            alamat: 'Jl. Testing Baru',
            nama_orang_tua: 'Bapak Test',
            no_hp_orang_tua: '08123456789',
            tahun_masuk: 2026,
            status: 'aktif'
        });
        assert.strictEqual(res.success, true);
    });

    // === MODUL LAINNYA ===
    await test("Modul Dashboard: Bisa Tarik Data Statistik", async () => {
        const res = await handlers['get-dashboard-stats']();
        assert.strictEqual(res.success, true);
        assert.ok(res.data.totalSiswa >= 0);
    });
    
    await test("Modul Laporan: Bisa Tarik Laporan Default", async () => {
        const res = await handlers['get-laporan'](null, { tipe: 'pemasukan' });
        assert.strictEqual(res.success, true);
    });

    await test("Sistem Login: Autentikasi Admin Dasar", async () => {
        const res = await handlers['login'](null, { username: 'admin_pasti_gagal', password: '123' });
        assert.strictEqual(res.success, false);
    });

    // === CLEANUP TEST DATA ===
    await test("Sistem Keamanan: Hapus Data Uji Coba (Siswa)", async () => {
        const res = await handlers['delete-siswa'](null, siswaId);
        assert.strictEqual(res.success, true);
    });
    
    await test("Sistem Keamanan: Hapus Data Uji Coba (Kelas)", async () => {
        const res = await handlers['delete-kelas'](null, kelasId);
        assert.strictEqual(res.success, true);
    });
    
    await test("Sistem Keamanan: Hapus Data Uji Coba (Tahun Ajaran)", async () => {
        const res = await handlers['delete-tahun-ajaran'](null, tahunId);
        assert.strictEqual(res.success, true);
    });

    console.log("\n=========================");
    console.log("=== HASIL AKHIR UJI Coba ===");
    console.log(`✅ LULUS  : ${passed}`);
    console.log(`❌ GAGAL  : ${failed}`);
    console.log(`TOTAL    : ${passed + failed}`);
    console.log("=========================\n");
    
    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runTests();
