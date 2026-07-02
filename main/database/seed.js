const bcrypt = require('bcryptjs');
const { getDB } = require('./db.js');

async function seedData() {
    const db = await getDB();

    // 1. Seed Users
    const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
        const hash = await bcrypt.hash('admin123', 10);
        await db.run('INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)', ['admin', hash, 'Administrator', 'admin']);
        console.log('User admin berhasil dibuat (username: admin, password: admin123).');
    }

    // 2. Seed Tahun Ajaran
    const taExists = await db.get('SELECT id FROM tahun_ajaran WHERE nama_tahun_ajaran = ?', ['2025/2026']);
    if (!taExists) {
        await db.run('INSERT INTO tahun_ajaran (nama_tahun_ajaran, semester, status_aktif) VALUES (?, ?, ?)', ['2025/2026', 'Ganjil', 1]);
        console.log('Tahun ajaran berhasil dibuat.');
    }

    // 3. Seed Kelas
    const kelasExists = await db.get('SELECT COUNT(*) as count FROM kelas');
    if (kelasExists.count === 0) {
        await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['VII-A', 7, 'Budi Santoso']);
        await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['VIII-A', 8, 'Siti Aminah']);
        await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', ['IX-A', 9, 'Ahmad Dahlan']);
        console.log('3 Kelas berhasil dibuat.');
    }

    // 4. Seed Siswa
    const siswaExists = await db.get('SELECT COUNT(*) as count FROM siswa');
    if (siswaExists.count === 0) {
        const query = `INSERT INTO siswa (nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        await db.run(query, ['2025001', '0012345671', 'Andi R.', 'L', 'Jakarta', '2012-05-10', 'Jl. Merdeka 1', 'Orang Tua Andi', '081234567890', 1, 2025, 'aktif']);
        await db.run(query, ['2025002', '0012345672', 'Budi S.', 'L', 'Bandung', '2012-06-15', 'Jl. Merdeka 2', 'Orang Tua Budi', '081234567891', 1, 2025, 'aktif']);
        await db.run(query, ['2025003', '0012345673', 'Citra K.', 'P', 'Surabaya', '2012-07-20', 'Jl. Merdeka 3', 'Orang Tua Citra', '081234567892', 1, 2025, 'aktif']);

        console.log('3 Siswa berhasil dibuat.');
    }

    // 5. Seed Pengaturan SPP
    const sppExists = await db.get('SELECT COUNT(*) as count FROM pengaturan_spp');
    if (sppExists.count === 0) {
        const querySPP = 'INSERT INTO pengaturan_spp (tahun_ajaran_id, kelas_id, nominal_spp, jatuh_tempo_tanggal) VALUES (?, ?, ?, ?)';
        await db.run(querySPP, [1, 1, 150000, 10]); // Kelas 7
        await db.run(querySPP, [1, 2, 175000, 10]); // Kelas 8
        await db.run(querySPP, [1, 3, 200000, 10]); // Kelas 9
        console.log('Pengaturan SPP berhasil dibuat.');
    }
}

module.exports = { seedData };

// Jika dipanggil langsung lewat node (bukan saat app jalan)
if (require.main === module) {
    const { initDB } = require('./db.js');
    initDB().then(() => seedData()).catch(console.error);
}
