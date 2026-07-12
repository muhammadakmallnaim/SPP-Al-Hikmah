const { writeLog } = require('../../main/logger');
const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');

module.exports = function registerKelasHandlers() {
    ipcMain.handle('get-kelas', async (event) => {
        try {
            const db = await getDB();
            const kelasList = await db.all('SELECT * FROM kelas ORDER BY tingkat ASC, nama_kelas ASC');
            return { success: true, data: kelasList };
        } catch (error) {
            console.error('Get kelas error:', error);
            return { success: false, message: 'Gagal mengambil data kelas' };
        }
    });

    ipcMain.handle('add-kelas', async (event, { nama_kelas, tingkat, wali_kelas }) => {
        try {
            const db = await getDB();
            const info = await db.run('INSERT INTO kelas (nama_kelas, tingkat, wali_kelas) VALUES (?, ?, ?)', [nama_kelas, tingkat, wali_kelas]);
            writeLog('Data Kelas', 'Tambah', 'Sukses', 'Berhasil menambahkan kelas baru');
            return { success: true, message: 'Kelas berhasil ditambahkan', id: info.lastID };
        } catch (error) {
            console.error('Add kelas error:', error);
            return { success: false, message: 'Gagal menambah kelas' };
        }
    });

    ipcMain.handle('update-kelas', async (event, { id, nama_kelas, tingkat, wali_kelas }) => {
        try {
            const db = await getDB();
            await db.run('UPDATE kelas SET nama_kelas = ?, tingkat = ?, wali_kelas = ? WHERE id = ?', [nama_kelas, tingkat, wali_kelas, id]);
            writeLog('Data Kelas', 'Edit', 'Sukses', 'Berhasil memperbarui data kelas');
            return { success: true, message: 'Kelas berhasil diperbarui' };
        } catch (error) {
            console.error('Update kelas error:', error);
            return { success: false, message: 'Gagal memperbarui kelas' };
        }
    });

    ipcMain.handle('delete-kelas', async (event, id) => {
        try {
            const db = await getDB();
            
            // Cek apakah kelas dipakai di siswa
            const cekSiswa = await db.get('SELECT id FROM siswa WHERE kelas_id = ? LIMIT 1', [id]);
            if (cekSiswa) {
                return { success: false, message: 'Kelas tidak bisa dihapus karena masih ada siswa di dalamnya' };
            }
            
            await db.run('DELETE FROM kelas WHERE id = ?', [id]);
            writeLog('Data Kelas', 'Hapus', 'Sukses', 'Berhasil menghapus data kelas');
            return { success: true, message: 'Kelas berhasil dihapus' };
        } catch (error) {
            console.error('Delete kelas error:', error);
            return { success: false, message: 'Gagal menghapus kelas' };
        }
    });
};
