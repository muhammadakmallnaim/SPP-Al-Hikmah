const fs = require('fs');
const path = require('path');
const ctrlDir = path.join(__dirname, 'src', 'controllers');

fs.readdirSync(ctrlDir).forEach(f => {
    if (!f.endsWith('.js')) return;
    let p = path.join(ctrlDir, f);
    let content = fs.readFileSync(p, 'utf8');
    
    // Inject Logout
    const logoutTarget = "sessionStorage.removeItem('user');";
    const logoutLog = "window.api.tambahLog({modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout dari sistem'});\n        ";
    if (content.includes(logoutTarget) && !content.includes("tindakan: 'Logout'")) {
        content = content.replace(logoutTarget, logoutLog + logoutTarget);
    }

    // Inject Laporan Excel
    if (f === 'laporan.js') {
        const excelTarget = 'XLSX.writeFile(wb, "Laporan_SPP_AlHikmah.xlsx");';
        const excelLog = "window.api.tambahLog({modul: 'Laporan', tindakan: 'Export Excel', status: 'Sukses', detail: 'Berhasil mengexport laporan ke Excel'});\n        ";
        if (content.includes(excelTarget) && !content.includes("Export Excel")) {
            content = content.replace(excelTarget, excelTarget + '\n        ' + excelLog);
        }

        const pdfTarget = "doc.save('Laporan_SPP_AlHikmah.pdf');";
        const pdfLog = "window.api.tambahLog({modul: 'Laporan', tindakan: 'Export PDF', status: 'Sukses', detail: 'Berhasil mengexport laporan ke PDF'});\n        ";
        if (content.includes(pdfTarget) && !content.includes("Export PDF")) {
            content = content.replace(pdfTarget, pdfTarget + '\n        ' + pdfLog);
        }
    }

    fs.writeFileSync(p, content);
});
console.log('Frontend logs injected successfully!');
