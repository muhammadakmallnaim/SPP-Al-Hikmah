const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');

module.exports = function registerDashboardHandlers() {
    ipcMain.handle('get-dashboard-stats', async () => {
        try {
            const db = await getDB();
            
            // Total Siswa
            const rowSiswa = await db.get('SELECT COUNT(*) as count FROM siswa');
            const totalSiswa = rowSiswa.count;
            
            // Total Kelas
            const rowKelas = await db.get('SELECT COUNT(*) as count FROM kelas');
            const totalKelas = rowKelas.count;
            
            // Tahun Ajaran Aktif
            const rowTA = await db.get('SELECT nama_tahun_ajaran, semester FROM tahun_ajaran WHERE status_aktif = true');
            const tahunAjaran = rowTA ? `${rowTA.nama_tahun_ajaran} (${rowTA.semester})` : '-';
            
            // Penerimaan Bulan Ini (dummy logic if not enough data)
            const rowPenerimaan = await db.get("SELECT SUM(nominal_dibayar) as total FROM pembayaran_spp WHERE TO_CHAR(tanggal_pembayaran, 'YYYY-MM') = TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM')");
            const penerimaanBulanIni = rowPenerimaan.total || 0;

            // Transaksi Terbaru
            const transaksi = await db.all(`
                SELECT p.no_transaksi, p.tanggal_pembayaran, p.nominal_dibayar, s.nama_siswa
                FROM pembayaran_spp p
                JOIN siswa s ON p.siswa_id = s.id
                ORDER BY p.tanggal_pembayaran DESC
                LIMIT 5
            `);

            // Grafik 6 Bulan Terakhir
            const grafik = [];
            for(let i=5; i>=0; i--) {
                const row = await db.get(`
                    SELECT TO_CHAR(CURRENT_TIMESTAMP - INTERVAL '${i} months', 'YYYY-MM') as bln, SUM(nominal_dibayar) as total
                    FROM pembayaran_spp
                    WHERE TO_CHAR(tanggal_pembayaran, 'YYYY-MM') = TO_CHAR(CURRENT_TIMESTAMP - INTERVAL '${i} months', 'YYYY-MM')
                `);
                grafik.push({
                    bulan: row?.bln || '',
                    total: row?.total || 0
                });
            }

            return { 
                success: true, 
                data: {
                    totalSiswa, totalKelas, tahunAjaran, penerimaanBulanIni, transaksi, grafik
                }
            };
        } catch (error) {
            console.error('Dashboard Error:', error);
            return { success: false, message: 'Gagal memuat statistik' };
        }
    });
};
