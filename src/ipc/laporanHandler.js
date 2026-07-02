const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');

module.exports = function registerLaporanHandlers() {
    ipcMain.handle('get-laporan', async (event, { bulan, tahun_ajaran_id, kelas_id }) => {
        try {
            const db = await getDB();
            let query = `
                SELECT 
                    p.no_transaksi, 
                    p.bulan_dibayar, 
                    p.tanggal_pembayaran, 
                    p.nominal_dibayar, 
                    s.nis, 
                    s.nama_siswa, 
                    k.nama_kelas,
                    u.nama_lengkap as kasir
                FROM pembayaran_spp p
                JOIN siswa s ON p.siswa_id = s.id
                JOIN kelas k ON s.kelas_id = k.id
                JOIN users u ON p.kasir_id = u.id
                WHERE p.status_pembayaran = 'Lunas'
            `;
            let params = [];

            if (tahun_ajaran_id) {
                query += ` AND p.tahun_ajaran_id = ?`;
                params.push(tahun_ajaran_id);
            }
            if (bulan) {
                query += ` AND p.bulan_dibayar = ?`;
                params.push(bulan);
            }
            if (kelas_id) {
                query += ` AND s.kelas_id = ?`;
                params.push(kelas_id);
            }

            query += ` ORDER BY p.tanggal_pembayaran DESC`;

            const laporan = await db.all(query, params);
            
            // Hitung total penerimaan
            const total = laporan.reduce((sum, row) => sum + row.nominal_dibayar, 0);

            return { success: true, data: laporan, total: total };
        } catch (error) {
            console.error('Laporan error:', error);
            return { success: false, message: 'Gagal mengambil data laporan' };
        }
    });
};
