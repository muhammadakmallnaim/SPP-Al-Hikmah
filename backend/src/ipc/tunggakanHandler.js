const { ipcMain } = require('electron');
const { getDB } = require('../../main/database/db');
const { writeLog } = require('../../main/logger');

const BULAN_GANJIL = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_GENAP = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
const SEMUA_BULAN = [...BULAN_GANJIL, ...BULAN_GENAP];

module.exports = function registerTunggakanHandlers() {
    ipcMain.handle('get-data-tunggakan', async (event, { kelas_id, keyword }) => {
        try {
            const db = await getDB();
            
            let querySiswa = `
                SELECT s.id, s.nis, s.nama_siswa, k.nama_kelas, k.id as kelas_aktif_id, s.status
                FROM siswa s
                JOIN kelas k ON s.kelas_id = k.id
                WHERE 1=1
            `;
            let params = [];

            if (kelas_id) {
                querySiswa += ` AND s.kelas_id = ?`;
                params.push(kelas_id);
            }
            if (keyword) {
                querySiswa += ` AND (s.nis ILIKE ? OR s.nama_siswa ILIKE ?)`;
                params.push(`%${keyword}%`, `%${keyword}%`);
            }
            querySiswa += ` ORDER BY s.nama_siswa ASC`;

            const siswaList = await db.all(querySiswa, params);
            
            // Hitung tunggakan untuk tiap siswa
            const hasilTunggakan = [];
            const currentDate = new Date();
            const currentMonthIdx = currentDate.getMonth(); // 0 = Jan, 6 = Jul
            const currentYear = currentDate.getFullYear();
            const currentDay = currentDate.getDate();
            
            // Map index js (0-11) ke urutan bulan sekolah (Juli = 0, Juni = 11)
            const mapBulanSekolah = {
                6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5,  // Jul-Des
                0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11   // Jan-Jun
            };
            const currentSchoolMonthIdx = mapBulanSekolah[currentMonthIdx];

            for (const siswa of siswaList) {
                const riwayat = await db.all(`
                    SELECT r.kelas_id, r.tahun_ajaran_id, ta.nama_tahun_ajaran, ta.status_aktif as ta_aktif
                    FROM riwayat_kelas r
                    JOIN tahun_ajaran ta ON r.tahun_ajaran_id = ta.id
                    WHERE r.siswa_id = ?
                    ORDER BY ta.nama_tahun_ajaran ASC
                `, [siswa.id]);

                let totalTunggakan = 0;
                const rincianPerSemester = [];

                for (const r of riwayat) {
                    const pengaturanSpp = await db.get(`
                        SELECT nominal_spp, jatuh_tempo_tanggal
                        FROM pengaturan_spp
                        WHERE kelas_id = ? AND tahun_ajaran_id = ?
                    `, [r.kelas_id, r.tahun_ajaran_id]);

                    if (!pengaturanSpp) continue;
                    
                    const pembayaran = await db.all(`
                        SELECT bulan_dibayar FROM pembayaran_spp
                        WHERE siswa_id = ? AND tahun_ajaran_id = ? AND status_pembayaran = 'Lunas'
                    `, [siswa.id, r.tahun_ajaran_id]);
                    
                    const lunasBulan = pembayaran.map(p => p.bulan_dibayar);
                    
                    let tunggakanGanjil = 0;
                    let bulanGanjilArr = [];
                    let tunggakanGenap = 0;
                    let bulanGenapArr = [];

                    for (let i = 0; i < SEMUA_BULAN.length; i++) {
                        const namaBulan = SEMUA_BULAN[i];
                        
                        // Logika apakah bulan ini sudah jatuh tempo
                        let isJatuhTempo = false;
                        if (r.ta_aktif) {
                            if (i < currentSchoolMonthIdx) {
                                isJatuhTempo = true;
                            } else if (i === currentSchoolMonthIdx) {
                                if (currentDay > pengaturanSpp.jatuh_tempo_tanggal) {
                                    isJatuhTempo = true;
                                }
                            }
                        } else {
                            // Jika tahun ajaran sudah lewat, maka semua bulan dianggap jatuh tempo
                            isJatuhTempo = true;
                        }

                        if (isJatuhTempo && !lunasBulan.includes(namaBulan)) {
                            if (i < 6) {
                                tunggakanGanjil += pengaturanSpp.nominal_spp;
                                bulanGanjilArr.push(namaBulan);
                            } else {
                                tunggakanGenap += pengaturanSpp.nominal_spp;
                                bulanGenapArr.push(namaBulan);
                            }
                        }
                    }

                    if (tunggakanGanjil > 0) {
                        rincianPerSemester.push({
                            tahun_ajaran: r.nama_tahun_ajaran,
                            semester: 'Ganjil',
                            total: tunggakanGanjil,
                            bulan: bulanGanjilArr
                        });
                        totalTunggakan += tunggakanGanjil;
                    }
                    if (tunggakanGenap > 0) {
                        rincianPerSemester.push({
                            tahun_ajaran: r.nama_tahun_ajaran,
                            semester: 'Genap',
                            total: tunggakanGenap,
                            bulan: bulanGenapArr
                        });
                        totalTunggakan += tunggakanGenap;
                    }
                }

                if (totalTunggakan > 0) {
                    hasilTunggakan.push({
                        siswa_id: siswa.id,
                        nis: siswa.nis,
                        nama_siswa: siswa.nama_siswa,
                        kelas_aktif: siswa.nama_kelas,
                        status_siswa: siswa.status,
                        total_tunggakan: totalTunggakan,
                        rincian: rincianPerSemester
                    });
                }
            }

            return { success: true, data: hasilTunggakan };
        } catch (error) {
            console.error('Error get data tunggakan:', error);
            return { success: false, message: 'Gagal memuat data tunggakan' };
        }
    });

    ipcMain.handle('export-pdf-tunggakan', async (event, filename) => {
        const { dialog } = require('electron');
        const fs = require('fs');
        const win = require('electron').BrowserWindow.fromWebContents(event.sender);
        
        try {
            const { filePath } = await dialog.showSaveDialog(win, {
                title: 'Simpan Surat Teguran',
                defaultPath: filename || 'Surat_Teguran_SPP.pdf',
                filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
            });
            
            if (filePath) {
                const pdfData = await win.webContents.printToPDF({
                    marginsType: 0,
                    pageSize: 'A4',
                    printBackground: true
                });
                fs.writeFileSync(filePath, pdfData);
                return { success: true, message: 'PDF berhasil disimpan', filePath };
            }
            return { success: false, message: 'Penyimpanan dibatalkan' };
        } catch (error) {
            console.error('Failed to export PDF:', error);
            return { success: false, message: 'Gagal mengekspor PDF' };
        }
    });
};
