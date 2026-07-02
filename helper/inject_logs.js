const fs = require('fs');
const path = require('path');
const ipcDir = path.join(__dirname, 'src', 'ipc');

const files = {
    'siswaHandler.js': {
        moduleName: 'Data Siswa',
        replacements: [
            { text: "return { success: true, message: 'Siswa berhasil ditambahkan'", action: 'Tambah', desc: "Berhasil menambahkan siswa baru" },
            { text: "return { success: true, message: 'Data siswa diperbarui'", action: 'Edit', desc: "Berhasil memperbarui data siswa" },
            { text: "return { success: true, message: 'Siswa berhasil dihapus'", action: 'Hapus', desc: "Berhasil menghapus data siswa" },
            { text: "return { success: true, message: 'Import data siswa berhasil'", action: 'Import', desc: "Berhasil mengimport data siswa dari Excel" }
        ]
    },
    'kelasHandler.js': {
        moduleName: 'Data Kelas',
        replacements: [
            { text: "return { success: true, message: 'Kelas berhasil ditambahkan'", action: 'Tambah', desc: "Berhasil menambahkan kelas baru" },
            { text: "return { success: true, message: 'Kelas berhasil diperbarui'", action: 'Edit', desc: "Berhasil memperbarui data kelas" },
            { text: "return { success: true, message: 'Kelas berhasil dihapus'", action: 'Hapus', desc: "Berhasil menghapus data kelas" }
        ]
    },
    'tahunAjaranHandler.js': {
        moduleName: 'Tahun Ajaran',
        replacements: [
            { text: "return { success: true, message: 'Tahun ajaran berhasil ditambahkan'", action: 'Tambah', desc: "Berhasil menambahkan tahun ajaran" },
            { text: "return { success: true, message: 'Tahun ajaran diperbarui'", action: 'Edit', desc: "Berhasil memperbarui tahun ajaran" },
            { text: "return { success: true, message: 'Tahun ajaran dihapus'", action: 'Hapus', desc: "Berhasil menghapus tahun ajaran" },
            { text: "return { success: true, message: 'Tahun ajaran diaktifkan'", action: 'Aktivasi', desc: "Berhasil mengaktifkan tahun ajaran" }
        ]
    },
    'pengaturanSPPHandler.js': {
        moduleName: 'Pengaturan SPP',
        replacements: [
            { text: "return { success: true, message: 'Pengaturan SPP ditambahkan'", action: 'Tambah', desc: "Berhasil menambah pengaturan nominal SPP" },
            { text: "return { success: true, message: 'Pengaturan SPP diperbarui'", action: 'Edit', desc: "Berhasil memperbarui pengaturan nominal SPP" },
            { text: "return { success: true, message: 'Pengaturan SPP dihapus'", action: 'Hapus', desc: "Berhasil menghapus pengaturan nominal SPP" }
        ]
    },
    'pembayaranHandler.js': {
        moduleName: 'Pembayaran',
        replacements: [
            { text: "return { success: true, message: 'Pembayaran berhasil diproses!'", action: 'Bayar Tagihan', desc: "Berhasil memproses pembayaran SPP siswa" }
        ]
    }
};

for (const [filename, config] of Object.entries(files)) {
    const p = path.join(ipcDir, filename);
    if (!fs.existsSync(p)) continue;
    
    let content = fs.readFileSync(p, 'utf8');
    
    if (!content.includes('writeLog')) {
        content = "const { writeLog } = require('../../main/logger');\n" + content;
    }

    config.replacements.forEach(rep => {
        const target = rep.text;
        const logLine = `writeLog('${config.moduleName}', '${rep.action}', 'Sukses', '${rep.desc}');`;
        if (content.includes(target) && !content.includes(logLine)) {
            content = content.replace(target, logLine + '\n            ' + target);
        }
    });

    fs.writeFileSync(p, content);
}
console.log('Backend logs injected successfully!');
