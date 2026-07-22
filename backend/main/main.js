const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDB } = require('./database/db');

// Import IPC Handlers
const registerUserHandlers = require('../src/ipc/userHandler');
const registerSiswaHandlers = require('../src/ipc/siswaHandler');
const registerKelasHandlers = require('../src/ipc/kelasHandler');
const registerTahunAjaranHandlers = require('../src/ipc/tahunAjaranHandler');
const registerPengaturanSPPHandlers = require('../src/ipc/pengaturanSPPHandler');
const registerPembayaranHandlers = require('../src/ipc/pembayaranHandler');
const registerLaporanHandlers = require('../src/ipc/laporanHandler');
const registerDashboardHandlers = require('../src/ipc/dashboardHandler');
const registerTunggakanHandlers = require('../src/ipc/tunggakanHandler');
const registerDataUserHandlers = require('../src/ipc/dataUserHandler');
const { registerLoggerHandlers } = require('./logger');

// Inisialisasi Database saat aplikasi mulai
initDB().catch(console.error);

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        icon: path.join(__dirname, '../src/assets/images/Logo_Aplikasi.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Hapus menu default (opsional, agar tampilan lebih rapi)
    mainWindow.setMenuBarVisibility(false);

    // Mulai dari halaman login
    mainWindow.loadFile(path.join(__dirname, '../src/views/login.html'));
    
    // Maximize window by default
    mainWindow.maximize();
}

app.whenReady().then(() => {
    // Mendaftarkan semua IPC Handler di sini
    registerUserHandlers();
    registerSiswaHandlers();
    registerKelasHandlers();
    registerTahunAjaranHandlers();
    registerPengaturanSPPHandlers();
    registerPembayaranHandlers();
    registerLaporanHandlers();
    registerDashboardHandlers();
    registerTunggakanHandlers();
    registerDataUserHandlers();
    registerLoggerHandlers();
    
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    const { writeLog } = require('./logger');
    writeLog('Sistem', 'Keluar', 'Info', 'Aplikasi ditutup oleh pengguna');
});
