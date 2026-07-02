const { writeLog } = require('../../main/logger');
const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');

module.exports = function registerPembayaranHandlers() {
    // 1. Ambil daftar siswa untuk pembayaran
    ipcMain.handle('get-siswa-pembayaran', async (event, { kelas_id, keyword }) => {
        try {
            const db = await getDB();
            let query = `
                SELECT s.id, s.nis, s.nama_siswa, k.nama_kelas 
                FROM siswa s
                JOIN kelas k ON s.kelas_id = k.id
                WHERE s.status = 'aktif'
            `;
            let params = [];

            if (kelas_id) {
                query += ` AND s.kelas_id = ?`;
                params.push(kelas_id);
            }
            if (keyword) {
                query += ` AND (s.nis LIKE ? OR s.nama_siswa LIKE ?)`;
                params.push(`%${keyword}%`, `%${keyword}%`);
            }

            query += ` ORDER BY s.nama_siswa ASC LIMIT 50`;
            const data = await db.all(query, params);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: 'Gagal memuat data siswa' };
        }
    });

    // 2. Mencari data siswa dan tagihan SPP-nya berdasarkan NIS
    ipcMain.handle('cari-tagihan-siswa', async (event, nis) => {
        try {
            const db = await getDB();
            
            // Ambil data siswa beserta kelasnya
            const siswa = await db.get(`
                SELECT s.id as siswa_id, s.nis, s.nama_siswa, k.id as kelas_id, k.nama_kelas 
                FROM siswa s
                JOIN kelas k ON s.kelas_id = k.id
                WHERE s.nis = ?
            `, [nis]);

            if (!siswa) {
                return { success: false, message: 'Data siswa dengan NIS tersebut tidak ditemukan.' };
            }

            // Ambil pengaturan SPP yang aktif untuk kelas tersebut
            const pengaturanSpp = await db.get(`
                SELECT p.id as pengaturan_id, p.nominal_spp, t.id as tahun_ajaran_id, t.nama_tahun_ajaran 
                FROM pengaturan_spp p
                JOIN tahun_ajaran t ON p.tahun_ajaran_id = t.id
                WHERE p.kelas_id = ? AND t.status_aktif = 1
                LIMIT 1
            `, [siswa.kelas_id]);

            if (!pengaturanSpp) {
                return { success: false, message: 'Pengaturan nominal SPP untuk kelas siswa ini di tahun ajaran aktif belum diatur.' };
            }

            // Daftar 12 bulan (Tahun Ajaran biasanya mulai Juli - Juni)
            const bulanList = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
            
            // Ambil data pembayaran yang sudah dilakukan oleh siswa pada tahun ajaran ini
            const pembayaran = await db.all(`
                SELECT bulan_dibayar, status_pembayaran, no_transaksi 
                FROM pembayaran_spp 
                WHERE siswa_id = ? AND tahun_ajaran_id = ? AND status_pembayaran = 'Lunas'
            `, [siswa.siswa_id, pengaturanSpp.tahun_ajaran_id]);

            const lunasMap = {};
            pembayaran.forEach(p => {
                lunasMap[p.bulan_dibayar] = p.no_transaksi;
            });

            // Tentukan status tiap bulan
            const tagihan = bulanList.map(bulan => ({
                bulan: bulan,
                nominal: pengaturanSpp.nominal_spp,
                status: lunasMap[bulan] ? 'Lunas' : 'Belum Dibayar',
                no_transaksi: lunasMap[bulan] || null
            }));

            return { 
                success: true, 
                data: {
                    siswa: siswa,
                    tahun_ajaran: pengaturanSpp.nama_tahun_ajaran,
                    tahun_ajaran_id: pengaturanSpp.tahun_ajaran_id,
                    nominal_spp: pengaturanSpp.nominal_spp,
                    tagihan: tagihan
                } 
            };
        } catch (error) {
            console.error('Cari tagihan error:', error);
            return { success: false, message: 'Terjadi kesalahan sistem saat mencari tagihan.' };
        }
    });

    // 2. Proses Pembayaran
    ipcMain.handle('proses-pembayaran', async (event, { siswa_id, tahun_ajaran_id, bulan_dibayar, nominal_dibayar, kasir_id }) => {
        try {
            const db = await getDB();
            
            // Cek apakah bulan tersebut sudah dibayar
            const cekLunas = await db.get(`
                SELECT id FROM pembayaran_spp 
                WHERE siswa_id = ? AND tahun_ajaran_id = ? AND bulan_dibayar = ? AND status_pembayaran = 'Lunas'
            `, [siswa_id, tahun_ajaran_id, bulan_dibayar]);

            if (cekLunas) {
                return { success: false, message: `Bulan ${bulan_dibayar} sudah lunas.` };
            }

            // Generate No Transaksi (Format: SPP-YYYYMMDD-Random)
            const date = new Date();
            const dateStr = date.toISOString().slice(0,10).replace(/-/g, '');
            const random = Math.floor(1000 + Math.random() * 9000);
            const no_transaksi = `SPP-${dateStr}-${random}`;

            // Insert ke database
            const stmt = await db.run(`
                INSERT INTO pembayaran_spp (no_transaksi, siswa_id, tahun_ajaran_id, bulan_dibayar, tanggal_pembayaran, nominal_dibayar, status_pembayaran, kasir_id)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'Lunas', ?)
            `, [no_transaksi, siswa_id, tahun_ajaran_id, bulan_dibayar, nominal_dibayar, kasir_id]);

            writeLog('Pembayaran', 'Bayar Tagihan', 'Sukses', 'Berhasil memproses pembayaran SPP siswa');
            return { success: true, message: 'Pembayaran berhasil diproses!', no_transaksi: no_transaksi };
        } catch (error) {
            console.error('Proses pembayaran error:', error);
            return { success: false, message: 'Gagal memproses pembayaran.' };
        }
    });
};
