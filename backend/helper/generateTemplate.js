const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const xlsx = require('xlsx');
const path = require('path');

(async () => {
    try {
        // Karena ini dijalankan via terminal Node (bukan UI Electron), 
        // kita arahkan manual ke lokasi database aslinya di AppData Windows
        const appDataPath = process.env.APPDATA || path.join(process.env.HOME, '.local', 'share');
        const dbPath = path.join(appDataPath, 'spp-al-hikmah', 'database.sqlite');
        
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        const siswaList = await db.all(`
            SELECT siswa.*, kelas.nama_kelas 
            FROM siswa 
            LEFT JOIN kelas ON siswa.kelas_id = kelas.id
            ORDER BY siswa.nama_siswa ASC
        `);

        const data = siswaList.map(s => ({
            NIS: s.nis,
            NISN: s.nisn || '',
            Nama: s.nama_siswa,
            JK: s.jenis_kelamin,
            Kelas: s.nama_kelas || '',
            Tempat_Lahir: s.tempat_lahir || '',
            Tanggal_Lahir: s.tanggal_lahir || '',
            Alamat: s.alamat || '',
            Nama_Orang_Tua: s.nama_orang_tua || '',
            No_HP_Orang_Tua: s.no_hp_orang_tua || '',
            Tahun_Masuk: s.tahun_masuk || '',
            Status: s.status || 'aktif'
        }));

        if(data.length === 0) {
            data.push({
                NIS: '1001', NISN: '0012345678', Nama: 'Ahmad Budi', JK: 'L', Kelas: '7 A', Tempat_Lahir: 'Jakarta', Tanggal_Lahir: '2008-05-12', Alamat: 'Jl. Merdeka No. 1', Nama_Orang_Tua: 'Budi Santoso', No_HP_Orang_Tua: '081234567890', Tahun_Masuk: 2023, Status: 'aktif'
            });
        }

        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Data Siswa");

        xlsx.writeFile(wb, "Template_Import_Siswa.xlsx");
        console.log("Template exported successfully from Roaming Data!");
        process.exit(0);
    } catch (e) {
        console.error("Gagal menarik data:", e);
        process.exit(1);
    }
})();
