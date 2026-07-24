const bcrypt = require('bcryptjs');
const { getDB } = require('./db.js');

async function seedData() {
    const db = await getDB();

    console.log('Mereset dan mengosongkan seluruh tabel database...');
    // Menghapus isi seluruh tabel dan me-reset ID (auto-increment) kembali ke 1.
    // CASCADE digunakan untuk memaksa hapus data yang saling berelasi.
    await db.exec(`
        TRUNCATE TABLE 
            pembayaran_spp, 
            pengaturan_spp, 
            riwayat_kelas, 
            siswa, 
            kelas, 
            tahun_ajaran, 
            users 
        RESTART IDENTITY CASCADE;
    `);

    // 1. Seed Users (Admin & Kepala Sekolah)
    const hashAdmin = await bcrypt.hash('admin123', 10);
    const hashKepsek = await bcrypt.hash('kepsek123', 10);

    await db.run('INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)', ['admin', hashAdmin, 'Administrator', 'admin']);
    console.log('User admin berhasil dibuat (username: admin, password: admin123).');

    await db.run('INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)', ['kepsek', hashKepsek, 'Bpk. Kepala Sekolah', 'kepala_sekolah']);
    console.log('User kepala sekolah berhasil dibuat (username: kepsek, password: kepsek123).');

    // 2. Seed Tahun Ajaran
    await db.run('INSERT INTO tahun_ajaran (nama_tahun_ajaran, semester, status_aktif) VALUES (?, ?, ?)', ['2026/2027', 'Ganjil', 1]);
    console.log('Tahun ajaran berhasil dibuat.');

    // 3. Seed Kelas (Tingkat 10, 11, 12)
    await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['X-TKJ', 10, 'Budi']);
    await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['XI-TKJ', 11, 'Aminah']);
    await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['XII-TKJ', 12, 'Ahmad']);
    await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['X-TKR', 10, 'Santoso']);
    await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['XI-TKR', 11, 'Siti']);
    await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['XII-TKR', 12, 'Dahlan']);
    console.log('3 Kelas (10, 11, 12) berhasil dibuat.');

    // 4. Seed Siswa (Langkat: Stabat, Gebang, Tanjung Pura)
    const querySiswa = `INSERT INTO siswa (nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    // Password default disamakan dengan NIS
    await db.run(querySiswa, ['2025001', '0012345671', 'Andi Rahman', 'L', 'Stabat', '2008-05-10', 'Jl. Sudirman No 1', 'Bapak Rahman', '081234567890', 1, 2025, 'aktif', '2025001']);
    console.log('3 Siswa dari daerah Kab. Langkat berhasil dibuat.');

    // 5. Seed Pengaturan SPP (75.000, 85.000, 90.000 jatuh tempo tgl 5)
    const querySPP = 'INSERT INTO pengaturan_spp (tahun_ajaran_id, kelas_id, nominal_spp, jatuh_tempo_tanggal) VALUES (?, ?, ?, ?)';
    await db.run(querySPP, [1, 1, 50000, 5]); // Kelas X TKJ
    await db.run(querySPP, [1, 2, 50000, 5]); // Kelas XI TKJ
    await db.run(querySPP, [1, 3, 50000, 5]); // Kelas XII TKJ
    await db.run(querySPP, [1, 4, 50000, 5]); // Kelas X TKR
    await db.run(querySPP, [1, 5, 50000, 5]); // Kelas XI TKR
    await db.run(querySPP, [1, 6, 50000, 5]); // Kelas XII TKR
    console.log('Pengaturan SPP berhasil dibuat.');

    // 6. Buat Riwayat Kelas agar tagihan bisa di-generate sistem
    const queryRiwayat = 'INSERT INTO riwayat_kelas (siswa_id, kelas_id, tahun_ajaran_id) VALUES (?, ?, ?)';
    await db.run(queryRiwayat, [1, 1, 1]);
    console.log('Riwayat Kelas Siswa berhasil dibuat.');

    console.log('====================================');
    console.log('SEEDER SELESAI!');
    console.log('Seluruh data berhasil disesuaikan.');
}

module.exports = { seedData };

if (require.main === module) {
    const { initDB } = require('./db.js');
    initDB().then(() => seedData()).then(() => process.exit(0)).catch(console.error);
}
