const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'src', 'views');
const controllersDir = path.join(__dirname, 'src', 'controllers');

// Inject toast.js to all HTML files
const htmlFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
    const filePath = path.join(viewsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('toast.js')) {
        content = content.replace('</body>', '    <script src="../controllers/toast.js"></script>\n</body>');
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

// Replace alert() with showToast() in controllers
const jsFiles = ['kelas.js', 'siswa.js', 'tahun-ajaran.js', 'pengaturan-akun.js', 'pengaturan-spp.js'];
for (const file of jsFiles) {
    const filePath = path.join(controllersDir, file);
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace alert('...') -> showToast('...', 'danger')
    content = content.replace(/alert\((['"`].+?['"`])\)/g, "showToast($1, 'danger')");
    content = content.replace(/alert\(res\.message\)/g, "showToast(res.message, 'danger')");
    content = content.replace(/alert\(response\.message\)/g, "showToast(response.message, 'danger')");
    
    // Convert successes
    // e.g. if (res.success) { loadData(); showToast('Berhasil', 'success'); }
    // Let's do some specific replacements
    
    if (file === 'kelas.js') {
        content = content.replace(/modalTambah\.hide\(\);\s*loadData\(\); \/\/ Refresh tabel/g, "modalTambah.hide(); loadData(); showToast('Kelas berhasil disimpan', 'success');");
        content = content.replace(/modalEdit\.hide\(\);\s*loadData\(\); \/\/ Refresh tabel/g, "modalEdit.hide(); loadData(); showToast('Kelas berhasil diupdate', 'success');");
        content = content.replace(/if\(res\.success\) \{\s*loadData\(\);\s*\}/g, "if(res.success) { loadData(); showToast('Kelas berhasil dihapus', 'success'); }");
    }

    if (file === 'tahun-ajaran.js') {
        content = content.replace(/if\(res\.success\) loadData\(\);/g, "if(res.success) { loadData(); showToast('Berhasil dihapus', 'success'); }");
        content = content.replace(/await window\.api\.setAktifTahunAjaran\(id\);\s*loadData\(\);/g, "await window.api.setAktifTahunAjaran(id); loadData(); showToast('Tahun Ajaran Aktif', 'success');");
        content = content.replace(/if \(res\.success\) \{\s*modalTA\.hide\(\);\s*loadData\(\);\s*\}/g, "if (res.success) { modalTA.hide(); loadData(); showToast('Tahun Ajaran berhasil disimpan', 'success'); }");
    }

    if (file === 'siswa.js') {
        content = content.replace(/if \(res\.success\) \{\s*modalSiswa\.hide\(\);\s*loadData\(\);\s*\}/g, "if (res.success) { modalSiswa.hide(); loadData(); showToast('Data siswa berhasil disimpan', 'success'); }");
        content = content.replace(/if \(res\.success\) loadData\(\);/g, "if (res.success) { loadData(); showToast('Berhasil dihapus', 'success'); }");
        content = content.replace(/if\(res\.success\) loadData\(\);/g, "if(res.success) { loadData(); showToast(res.message, 'success'); }");
    }

    if (file === 'pengaturan-akun.js') {
        // already has alertSuccess.textContent ... but we can also add toast
        // Actually, user wants Toaster in all CRUD. We will leave alertSuccess alone or replace it.
    }

    if (file === 'pengaturan-spp.js') {
        // ...
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Toast injection complete.');
