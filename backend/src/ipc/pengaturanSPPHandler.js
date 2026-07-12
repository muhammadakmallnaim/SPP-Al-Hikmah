const { writeLog } = require('../../main/logger');
const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');

module.exports = function registerPengaturanSPPHandlers() {
    ipcMain.handle('get-pengaturan-spp', async (event) => {
        try {
            const db = await getDB();
            const list = await db.all(`
                SELECT p.*, k.nama_kelas, t.nama_tahun_ajaran 
                FROM pengaturan_spp p
                JOIN kelas k ON p.kelas_id = k.id
                JOIN tahun_ajaran t ON p.tahun_ajaran_id = t.id
                ORDER BY t.nama_tahun_ajaran DESC, k.tingkat ASC
            `);
            return { success: true, data: list };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Gagal mengambil pengaturan SPP' };
        }
    });

    ipcMain.handle('add-pengaturan-spp', async (event, data) => {
        try {
            const db = await getDB();
            const { kelas_id, tahun_ajaran_id, nominal_spp, jatuh_tempo_tanggal } = data;
            
            // Cek jika sudah ada
            const exist = await db.get('SELECT id FROM pengaturan_spp WHERE kelas_id=? AND tahun_ajaran_id=?', [kelas_id, tahun_ajaran_id]);
            if (exist) return { success: false, message: 'Pengaturan untuk Kelas dan Tahun Ajaran ini sudah ada' };

            await db.run('INSERT INTO pengaturan_spp (kelas_id, tahun_ajaran_id, nominal_spp, jatuh_tempo_tanggal) VALUES (?, ?, ?, ?)', [kelas_id, tahun_ajaran_id, nominal_spp, jatuh_tempo_tanggal]);
            return { success: true, message: 'Pengaturan berhasil ditambahkan' };
        } catch (error) {
            return { success: false, message: 'Gagal menambahkan pengaturan SPP' };
        }
    });

    ipcMain.handle('update-pengaturan-spp', async (event, data) => {
        try {
            const db = await getDB();
            const { id, kelas_id, tahun_ajaran_id, nominal_spp, jatuh_tempo_tanggal } = data;
            
            const exist = await db.get('SELECT id FROM pengaturan_spp WHERE kelas_id=? AND tahun_ajaran_id=? AND id != ?', [kelas_id, tahun_ajaran_id, id]);
            if (exist) return { success: false, message: 'Pengaturan untuk Kelas dan Tahun Ajaran ini sudah ada di entri lain' };

            await db.run('UPDATE pengaturan_spp SET kelas_id=?, tahun_ajaran_id=?, nominal_spp=?, jatuh_tempo_tanggal=? WHERE id=?', [kelas_id, tahun_ajaran_id, nominal_spp, jatuh_tempo_tanggal, id]);
            return { success: true, message: 'Pengaturan berhasil diperbarui' };
        } catch (error) {
            return { success: false, message: 'Gagal memperbarui pengaturan SPP' };
        }
    });

    ipcMain.handle('delete-pengaturan-spp', async (event, id) => {
        try {
            const db = await getDB();
            await db.run('DELETE FROM pengaturan_spp WHERE id = ?', [id]);
            return { success: true, message: 'Pengaturan berhasil dihapus' };
        } catch (error) {
            return { success: false, message: 'Gagal menghapus pengaturan SPP' };
        }
    });
};
