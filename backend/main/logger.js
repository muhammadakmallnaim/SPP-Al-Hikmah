const fs = require('fs');
const path = require('path');
const os = require('os');
const { ipcMain, shell } = require('electron');

const appDataPath = process.env.APPDATA || path.join(os.homedir(), '.local', 'share');
const logDir = path.join(appDataPath, 'spp-al-hikmah');
const logFile = path.join(logDir, 'Log_Aktivitas.csv');


function writeLog(modul, tindakan, status, detail) {
    try {
        const appDataPath = process.env.APPDATA || path.join(os.homedir(), '.local', 'share');
        const logDir = path.join(appDataPath, 'spp-al-hikmah');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        
        // Kita gunakan format CSV agar bisa dibuka dengan rapi di Microsoft Excel
        const logFile = path.join(logDir, 'Log_Aktivitas.csv');
        
        // Buat header kolom jika file belum pernah dibuat
        if (!fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '\uFEFFWaktu,Modul,Tindakan,Status,Detail\n', 'utf8'); // \uFEFF agar Excel membaca UTF-8 dengan benar
        }

        // Ambil waktu saat ini
        const waktu = new Date().toLocaleString('id-ID');
        
        // Fungsi untuk membersihkan teks agar format CSV (Excel) tidak rusak jika ada koma atau enter
        const clean = (text) => `"${String(text).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        
        const line = `${clean(waktu)},${clean(modul)},${clean(tindakan)},${clean(status)},${clean(detail)}\n`;
        
        // Tambahkan baris log ke file tanpa menghapus isi sebelumnya
        fs.appendFileSync(logFile, line, 'utf8');
    } catch (e) {
        console.error('Gagal menulis log:', e);
    }
}

function registerLoggerHandlers() {
    ipcMain.handle('get-log-aktivitas', async () => {
        if (!fs.existsSync(logFile)) return { success: true, data: [] };
        try {
            const data = fs.readFileSync(logFile, 'utf8');
            const lines = data.split('\n').filter(l => l.trim() !== '');
            const logs = [];
            for (let i = lines.length - 1; i > 0; i--) { // Skip header, latest first
                // Format file ini dipisahkan oleh "," karena kita yang generate
                const rawParts = lines[i].slice(1, -1).split('","');
                if (rawParts.length >= 5) {
                    logs.push({
                        waktu: rawParts[0],
                        modul: rawParts[1],
                        tindakan: rawParts[2],
                        status: rawParts[3],
                        detail: rawParts[4]
                    });
                }
            }
            return { success: true, data: logs };
        } catch (error) {
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('hapus-log-aktivitas', async () => {
        try {
            if (fs.existsSync(logFile)) {
                fs.unlinkSync(logFile);
                return { success: true, message: 'Log aktivitas berhasil dihapus' };
            }
            return { success: false, message: 'File log tidak ditemukan' };
        } catch (error) {
            if (error.code === 'EBUSY' || error.code === 'EPERM') {
                return { success: false, message: 'Gagal: File log sedang terbuka di Microsoft Excel. Mohon tutup file tersebut terlebih dahulu.' };
            }
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('open-log-aktivitas', async () => {
        try {
            if (!fs.existsSync(logFile)) return { success: false, message: 'Log belum ada' };
            shell.openPath(logFile);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('tambah-log', async (event, data) => {
        writeLog(data.modul, data.tindakan, data.status, data.detail);
        return { success: true };
    });
}

module.exports = { writeLog, registerLoggerHandlers };
