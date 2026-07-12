const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');
const xlsx = require('xlsx');
const { writeLog } = require('../../main/logger');

module.exports = function registerSiswaHandlers() {
    ipcMain.handle('get-siswa', async (event) => {
        try {
            const db = await getDB();
            const siswaList = await db.all(`
                SELECT siswa.*, kelas.nama_kelas 
                FROM siswa 
                LEFT JOIN kelas ON siswa.kelas_id = kelas.id
                ORDER BY siswa.nama_siswa ASC
            `);
            return { success: true, data: siswaList };
        } catch (error) {
            console.error('Get siswa error:', error);
            return { success: false, message: 'Terjadi kesalahan saat mengambil data siswa' };
        }
    });

    ipcMain.handle('add-siswa', async (event, data) => {
        try {
            const db = await getDB();
            const { nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status } = data;
            
            // Cek NIS unik
            const cekNis = await db.get('SELECT id FROM siswa WHERE nis = ?', [nis]);
            if (cekNis) return { success: false, message: 'NIS sudah terdaftar' };

            await db.run(`INSERT INTO siswa (nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                          [nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status]);
            writeLog('Data Siswa', 'Tambah', 'Sukses', `Menambahkan siswa baru: ${nama_siswa} (NIS: ${nis})`);
            writeLog('Data Siswa', 'Tambah', 'Sukses', 'Berhasil menambahkan siswa baru');
            return { success: true, message: 'Siswa berhasil ditambahkan' };
        } catch (error) {
            console.error(error);
            writeLog('Data Siswa', 'Tambah', 'Gagal', `Error: ${error.message}`);
            return { success: false, message: 'Gagal menambah siswa' };
        }
    });

    ipcMain.handle('update-siswa', async (event, data) => {
        try {
            const db = await getDB();
            const { id, nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status } = data;
            
            const cekNis = await db.get('SELECT id FROM siswa WHERE nis = ? AND id != ?', [nis, id]);
            if (cekNis) return { success: false, message: 'NIS sudah terdaftar untuk siswa lain' };

            await db.run(`UPDATE siswa SET nis=?, nisn=?, nama_siswa=?, jenis_kelamin=?, tempat_lahir=?, tanggal_lahir=?, alamat=?, nama_orang_tua=?, no_hp_orang_tua=?, kelas_id=?, tahun_masuk=?, status=? WHERE id=?`, 
                          [nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status, id]);
            writeLog('Data Siswa', 'Edit', 'Sukses', `Mengubah data siswa: ${nama_siswa} (NIS: ${nis})`);
            return { success: true, message: 'Data siswa berhasil diperbarui' };
        } catch (error) {
            console.error(error);
            writeLog('Data Siswa', 'Edit', 'Gagal', `Error: ${error.message}`);
            return { success: false, message: 'Gagal memperbarui siswa' };
        }
    });

    ipcMain.handle('delete-siswa', async (event, id) => {
        try {
            const db = await getDB();
            
            // Cek riwayat pembayaran
            const cekBayar = await db.get('SELECT id FROM pembayaran_spp WHERE siswa_id = ? LIMIT 1', [id]);
            if (cekBayar) return { success: false, message: 'Siswa tidak bisa dihapus karena memiliki riwayat pembayaran' };

            await db.run('DELETE FROM siswa WHERE id = ?', [id]);
            writeLog('Data Siswa', 'Hapus', 'Sukses', `Menghapus ID siswa: ${id}`);
            writeLog('Data Siswa', 'Hapus', 'Sukses', 'Berhasil menghapus data siswa');
            return { success: true, message: 'Siswa berhasil dihapus' };
        } catch (error) {
            console.error(error);
            writeLog('Data Siswa', 'Hapus', 'Gagal', `Error: ${error.message}`);
            return { success: false, message: 'Gagal menghapus siswa' };
        }
    });

    ipcMain.handle('import-siswa', async (event, fileData) => {
        try {
            const db = await getDB();
            const workbook = xlsx.read(fileData, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if(data.length === 0) return { success: false, message: 'File Excel kosong' };

            let countBerhasil = 0;
            let countUpdate = 0;
            let countGagal = 0;
            let detailLog = [];

            for (const row of data) {
                const nisRaw = row.NIS || '';
                const namaRaw = row.Nama || row.Nama_Siswa || '';
                try {
                    const nis = String(nisRaw).trim();
                    const nisn = String(row.NISN || '').trim();
                    const nama = String(namaRaw).trim();
                    const nama_kelas = String(row.Kelas || '').trim();
                    const jk = String(row.JK || row.Jenis_Kelamin || 'L').trim();
                    const tempat_lahir = String(row.Tempat_Lahir || '').trim();
                    const tanggal_lahir = String(row.Tanggal_Lahir || '').trim();
                    const alamat = String(row.Alamat || '').trim();
                    const nama_orang_tua = String(row.Nama_Orang_Tua || row.Nama_Ortu || '').trim();
                    const no_hp_orang_tua = String(row.No_HP_Orang_Tua || row.No_HP_Ortu || '').trim();
                    const tahun_masuk = row.Tahun_Masuk ? parseInt(row.Tahun_Masuk) : new Date().getFullYear();
                    const status_excel = String(row.Status || '').trim().toLowerCase();
                    const status_akhir = ['aktif', 'lulus', 'pindah'].includes(status_excel) ? status_excel : 'aktif';

                    if (!nis || !nama) { 
                        countGagal++; 
                        detailLog.push(`Baris gagal: NIS atau Nama kosong`);
                        continue; 
                    }

                    // Cari ID Kelas berdasarkan namanya
                    let kelas_id = null;
                    if (nama_kelas) {
                        const kls = await db.get('SELECT id FROM kelas WHERE nama_kelas = ? COLLATE NOCASE', [nama_kelas]);
                        if (kls) kelas_id = kls.id;
                    }

                    // Cek apakah siswa sudah ada (berdasarkan NISN & Nama, ATAU NIS)
                    let existingSiswa = null;
                    if (nisn) {
                        existingSiswa = await db.get('SELECT * FROM siswa WHERE nisn = ? AND nama_siswa = ?', [nisn, nama]);
                    }
                    if (!existingSiswa && nis) {
                        existingSiswa = await db.get('SELECT * FROM siswa WHERE nis = ?', [nis]);
                    }

                    if (existingSiswa) {
                        // Jika sudah ada, update kelas (jika diisi) dan update status
                        const updateKelasId = kelas_id !== null ? kelas_id : existingSiswa.kelas_id;
                        await db.run('UPDATE siswa SET kelas_id = ?, status = ? WHERE id = ?', [updateKelasId, status_akhir, existingSiswa.id]);
                        countUpdate++;
                        
                        if (existingSiswa.nis === nis && existingSiswa.nama_siswa !== nama) {
                            detailLog.push(`[DUPLIKAT] NIS ${nis} diklaim oleh '${nama}' di Excel, tapi NIS ini milik '${existingSiswa.nama_siswa}'. Hanya merubah kelas/status '${existingSiswa.nama_siswa}'.`);
                        } else {
                            detailLog.push(`[UPDATE] ${nama} (${nis}) diperbarui (Naik Kelas/Status).`);
                        }
                    } else {
                        // Jika belum ada, masukkan sebagai siswa baru lengkap dengan data detailnya
                        await db.run(`INSERT INTO siswa (nis, nisn, nama_siswa, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                            [nis, nisn, nama, jk, tempat_lahir, tanggal_lahir, alamat, nama_orang_tua, no_hp_orang_tua, kelas_id, tahun_masuk, status_akhir]);
                        countBerhasil++;
                        detailLog.push(`[BARU] ${nama} (${nis}) berhasil diinput.`);
                    }
                } catch(e) {
                    console.error('Error baris import:', e);
                    countGagal++;
                    detailLog.push(`[ERROR] Gagal memproses data ${namaRaw} (${nisRaw}) - ${e.message}`);
                }
            }
            
            const message = `Import selesai: ${countBerhasil} siswa baru, ${countUpdate} siswa diupdate, ${countGagal} gagal.`;
            writeLog('Data Siswa', 'Import Excel', 'Sukses', `${message} Rincian: ${detailLog.join(' | ')}`);
            return { success: true, message: message };
        } catch (error) {
            console.error(error);
            writeLog('Data Siswa', 'Import Excel', 'Gagal', `File gagal diproses: ${error.message}`);
            return { success: false, message: 'Error Import: ' + error.message };
        }
    });
};
