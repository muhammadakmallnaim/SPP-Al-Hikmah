const { contextBridge, ipcRenderer } = require('electron');

// Expose fungsi-fungsi IPC ke Renderer Process dalam object `window.api`
contextBridge.exposeInMainWorld('api', {
    // --- Modul Dashboard ---
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),

    // --- Modul Auth ---
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    updateAkun: (data) => ipcRenderer.invoke('update-akun', data),
    
    // --- Modul Siswa ---
    getSiswa: () => ipcRenderer.invoke('get-siswa'),
    addSiswa: (data) => ipcRenderer.invoke('add-siswa', data),
    updateSiswa: (data) => ipcRenderer.invoke('update-siswa', data),
    deleteSiswa: (id) => ipcRenderer.invoke('delete-siswa', id),
    importSiswa: (filePath) => ipcRenderer.invoke('import-siswa', filePath),
    generateAkun: (data) => ipcRenderer.invoke('generate-akun', data),

    // --- Modul Kelas ---
    getKelas: () => ipcRenderer.invoke('get-kelas'),
    addKelas: (data) => ipcRenderer.invoke('add-kelas', data),
    updateKelas: (data) => ipcRenderer.invoke('update-kelas', data),
    deleteKelas: (id) => ipcRenderer.invoke('delete-kelas', id),

    // --- Modul Tahun Ajaran ---
    getTahunAjaran: () => ipcRenderer.invoke('get-tahun-ajaran'),
    addTahunAjaran: (data) => ipcRenderer.invoke('add-tahun-ajaran', data),
    updateTahunAjaran: (data) => ipcRenderer.invoke('update-tahun-ajaran', data),
    deleteTahunAjaran: (id) => ipcRenderer.invoke('delete-tahun-ajaran', id),
    setAktifTahunAjaran: (id) => ipcRenderer.invoke('set-aktif-tahun-ajaran', id),

    // --- Modul Pengaturan SPP ---
    getPengaturanSPP: () => ipcRenderer.invoke('get-pengaturan-spp'),
    addPengaturanSPP: (data) => ipcRenderer.invoke('add-pengaturan-spp', data),
    updatePengaturanSPP: (data) => ipcRenderer.invoke('update-pengaturan-spp', data),
    deletePengaturanSPP: (id) => ipcRenderer.invoke('delete-pengaturan-spp', id),

    // --- Modul Pembayaran ---
    getSiswaPembayaran: (payload) => ipcRenderer.invoke('get-siswa-pembayaran', payload),
    cariTagihanSiswa: (nis) => ipcRenderer.invoke('cari-tagihan-siswa', nis),
    prosesPembayaran: (data) => ipcRenderer.invoke('proses-pembayaran', data),

    // --- Modul Laporan ---
    getLaporan: (filter) => ipcRenderer.invoke('get-laporan', filter),

    // --- Modul Logger ---
    getLogAktivitas: () => ipcRenderer.invoke('get-log-aktivitas'),
    hapusLogAktivitas: () => ipcRenderer.invoke('hapus-log-aktivitas'),
    openLogAktivitas: () => ipcRenderer.invoke('open-log-aktivitas'),
    tambahLog: (data) => ipcRenderer.invoke('tambah-log', data),
});
