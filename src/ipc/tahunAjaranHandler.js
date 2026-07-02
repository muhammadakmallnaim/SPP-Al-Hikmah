const { writeLog } = require('../../main/logger');
const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');

module.exports = function registerTahunAjaranHandlers() {
    ipcMain.handle('get-tahun-ajaran', async (event) => {
        try {
            const db = await getDB();
            const list = await db.all('SELECT * FROM tahun_ajaran ORDER BY id DESC');
            return { success: true, data: list };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Gagal mengambil data tahun ajaran' };
        }
    });

    ipcMain.handle('add-tahun-ajaran', async (event, { nama_tahun_ajaran, semester, status_aktif }) => {
        try {
            const db = await getDB();
            if (status_aktif) {
                await db.run('UPDATE tahun_ajaran SET status_aktif = false'); // Nonaktifkan yg lain
            }
            await db.run('INSERT INTO tahun_ajaran (nama_tahun_ajaran, semester, status_aktif) VALUES (?, ?, ?)', [nama_tahun_ajaran, semester, status_aktif ? true : false]);
            writeLog('Tahun Ajaran', 'Tambah', 'Sukses', 'Berhasil menambahkan tahun ajaran');
            return { success: true, message: 'Tahun ajaran berhasil ditambahkan' };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Gagal menambah data' };
        }
    });

    ipcMain.handle('update-tahun-ajaran', async (event, { id, nama_tahun_ajaran, semester, status_aktif }) => {
        try {
            const db = await getDB();
            if (status_aktif) {
                await db.run('UPDATE tahun_ajaran SET status_aktif = false');
            }
            await db.run('UPDATE tahun_ajaran SET nama_tahun_ajaran = ?, semester = ?, status_aktif = ? WHERE id = ?', [nama_tahun_ajaran, semester, status_aktif ? true : false, id]);
            writeLog('Tahun Ajaran', 'Edit', 'Sukses', 'Berhasil memperbarui tahun ajaran');
            return { success: true, message: 'Tahun ajaran diperbarui' };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Gagal memperbarui data' };
        }
    });

    ipcMain.handle('delete-tahun-ajaran', async (event, id) => {
        try {
            const db = await getDB();
            
            // Cek apakah dipakai di pengaturan spp
            const cekSPP = await db.get('SELECT id FROM pengaturan_spp WHERE tahun_ajaran_id = ? LIMIT 1', [id]);
            if (cekSPP) return { success: false, message: 'Tidak bisa dihapus, tahun ajaran ini memiliki pengaturan SPP' };

            await db.run('DELETE FROM tahun_ajaran WHERE id = ?', [id]);
            writeLog('Tahun Ajaran', 'Hapus', 'Sukses', 'Berhasil menghapus tahun ajaran');
            return { success: true, message: 'Tahun ajaran dihapus' };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Gagal menghapus data' };
        }
    });

    ipcMain.handle('set-aktif-tahun-ajaran', async (event, id) => {
        try {
            const db = await getDB();
            await db.run('UPDATE tahun_ajaran SET status_aktif = false');
            await db.run('UPDATE tahun_ajaran SET status_aktif = true WHERE id = ?', [id]);
            writeLog('Tahun Ajaran', 'Aktivasi', 'Sukses', 'Berhasil mengaktifkan tahun ajaran');
            return { success: true, message: 'Tahun ajaran diaktifkan' };
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Gagal mengubah status' };
        }
    });
};
