const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');
const bcrypt = require('bcryptjs');
const { writeLog } = require('../../main/logger');

module.exports = function registerUserHandlers() {
    ipcMain.handle('login', async (event, { username, password }) => {
        try {
            const db = await getDB();
            const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
            if (!user) {
                writeLog('Autentikasi', 'Login', 'Gagal', `Username tidak ditemukan: ${username}`);
                return { success: false, message: 'Username tidak ditemukan' };
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                writeLog('Autentikasi', 'Login', 'Gagal', `Password salah untuk username: ${username}`);
                return { success: false, message: 'Password salah' };
            }

            delete user.password;
            writeLog('Autentikasi', 'Login', 'Sukses', `Berhasil login: ${user.nama_lengkap} (${username})`);
            return { success: true, data: user };
        } catch (error) {
            writeLog('Autentikasi', 'Login', 'Error', `Sistem gagal memproses login: ${error.message}`);
            console.error('Login error:', error);
            return { success: false, message: 'Terjadi kesalahan internal server' };
        }
    });

    ipcMain.handle('update-akun', async (event, { id, username, nama_lengkap, password }) => {
        try {
            const db = await getDB();
            
            // Cek apakah username sudah dipakai orang lain
            const existingUser = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
            if (existingUser) {
                return { success: false, message: 'Username sudah digunakan oleh pengguna lain' };
            }

            if (password) {
                const hash = await bcrypt.hash(password, 10);
                await db.run('UPDATE users SET username = ?, nama_lengkap = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [username, nama_lengkap, hash, id]);
            } else {
                await db.run('UPDATE users SET username = ?, nama_lengkap = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [username, nama_lengkap, id]);
            }
            writeLog('Pengaturan Akun', 'Edit Profil', 'Sukses', `Berhasil memperbarui profil: ${nama_lengkap} (${username})`);
            return { success: true, message: 'Akun berhasil diperbarui' };
        } catch (error) {
            writeLog('Pengaturan Akun', 'Edit Profil', 'Gagal', `Gagal memperbarui profil: ${error.message}`);
            console.error('Update akun error:', error);
            return { success: false, message: 'Terjadi kesalahan saat memperbarui akun' };
        }
    });
};
