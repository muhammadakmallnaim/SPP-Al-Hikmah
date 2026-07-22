const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');
const bcrypt = require('bcryptjs');

module.exports = function registerDataUserHandlers() {
    ipcMain.handle('get-all-users', async () => {
        try {
            const db = await getDB();
            const data = await db.all(`SELECT id, username, nama_lengkap, role FROM users ORDER BY role ASC, nama_lengkap ASC`);
            return { success: true, data };
        } catch (error) {
            return { success: false, message: 'Gagal memuat data user' };
        }
    });

    ipcMain.handle('add-user', async (event, data) => {
        try {
            const db = await getDB();
            
            const cekUsername = await db.get(`SELECT id FROM users WHERE username = ?`, [data.username]);
            if (cekUsername) {
                return { success: false, message: 'Username sudah digunakan' };
            }

            const hashedPassword = await bcrypt.hash(data.password, 10);
            
            await db.run(`
                INSERT INTO users (username, password, nama_lengkap, role)
                VALUES (?, ?, ?, ?)
            `, [data.username, hashedPassword, data.nama_lengkap, data.role]);
            
            return { success: true, message: 'User berhasil ditambahkan' };
        } catch (error) {
            console.error('Error add user:', error);
            return { success: false, message: 'Gagal menambahkan user' };
        }
    });

    ipcMain.handle('update-user', async (event, data) => {
        try {
            const db = await getDB();
            
            const cekUsername = await db.get(`SELECT id FROM users WHERE username = ? AND id != ?`, [data.username, data.id]);
            if (cekUsername) {
                return { success: false, message: 'Username sudah digunakan oleh user lain' };
            }

            let query = `UPDATE users SET username = ?, nama_lengkap = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            let params = [data.username, data.nama_lengkap, data.role, data.id];

            if (data.password) {
                const hashedPassword = await bcrypt.hash(data.password, 10);
                query = `UPDATE users SET username = ?, password = ?, nama_lengkap = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                params = [data.username, hashedPassword, data.nama_lengkap, data.role, data.id];
            }

            await db.run(query, params);
            return { success: true, message: 'User berhasil diperbarui' };
        } catch (error) {
            return { success: false, message: 'Gagal memperbarui user' };
        }
    });

    ipcMain.handle('delete-user', async (event, id) => {
        try {
            const db = await getDB();
            await db.run(`DELETE FROM users WHERE id = ?`, [id]);
            return { success: true, message: 'User berhasil dihapus' };
        } catch (error) {
            return { success: false, message: 'Gagal menghapus user' };
        }
    });
};
