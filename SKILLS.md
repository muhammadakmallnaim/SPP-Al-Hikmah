# SKILLS & KNOWLEDGE BASE: Aplikasi SPP Al-Hikmah

Dokumen ini berisi rangkuman teknis, arsitektur, dan pedoman (*guidelines*) pengembangan Aplikasi SPP Al-Hikmah. Gunakan dokumen ini sebagai acuan (Prompt Context) bagi pengembang atau AI *Assistant* di masa depan agar tidak salah menerka alur dan struktur aplikasi.

---

## 1. Teknologi & Arsitektur Utama
Aplikasi ini dibangun menggunakan pola arsitektur **Desktop Client-Server (Lokal)** berbasis Web Technology.
* **Core Framework:** Electron.js (Main Process & Renderer Process).
* **Database:** SQLite3 (Lokal, tersimpan secara persisten).
* **Frontend:** Vanilla HTML5, CSS3, dan Vanilla JavaScript (Tanpa framework seperti React/Vue).
* **Styling Framework:** Bootstrap 5 (dengan kustomisasi warna khusus).
* **Icons:** FontAwesome 6.4.0.
* **Pencetakan Laporan/PDF:** jsPDF & jsPDF-AutoTable (Client-side).
* **Import/Export Data Excel:** SheetJS (xlsx).
* **Grafik Dashboard:** Chart.js.

## 2. Struktur Direktori Project
Struktur folder dipisahkan dengan sangat ketat antara Backend (Node.js) dan Frontend (Web).

```text
spp-al-hikmah/
│
├── main/                   # BACKEND (Node.js Environment)
│   ├── main.js             # Entry point Electron, pembuat window
│   ├── preload.js          # Jembatan (Bridge) antara Backend & Frontend
│   ├── logger.js           # Sistem pencatatan log aktivitas (Log_Aktivitas.csv)
│   └── database/
│       ├── db.js           # Inisialisasi & Skema tabel SQLite
│       └── seed.js         # Data awal (Admin default, dll)
│
├── src/                    # FRONTEND & IPC
│   ├── ipc/                # Kumpulan Handler Backend untuk merespon Frontend
│   │   ├── userHandler.js, siswaHandler.js, pembayaranHandler.js, dll.
│   │
│   ├── views/              # UI / Tampilan HTML
│   │   ├── login.html, dashboard.html, pembayaran.html, dll.
│   │
│   ├── controllers/        # Logika Frontend (DOM Manipulation, Event Listeners)
│   │   ├── login.js, dashboard.js, toast.js (Sistem Notifikasi), dll.
│   │
│   └── assets/             # Gambar, Logo, dan File Statis (Logo_Aplikasi.jpeg)
│
└── helper/                 # ALAT BANTU PENGEMBANGAN (DEV TOOLS)
    ├── test.js             # Script Unit Testing otomatis
    ├── generateTemplate.js # Generator Template Excel Import Siswa
    └── ...
```

---

## 3. Aturan Komunikasi Data (Backend - Frontend)
* **PENTING:** Frontend (`src/controllers/*.js`) **TIDAK BOLEH** mengeksekusi *query database* secara langsung.
* Semua komunikasi wajib melalui jembatan **IPC (Inter-Process Communication)** yang terdaftar di `main/preload.js`.
* **Pola Eksekusi:** 
  1. Tombol ditekan di Frontend (`controllers/siswa.js`).
  2. Memanggil fungsi jembatan: `window.api.addSiswa(data)`.
  3. Diterima oleh Backend (`src/ipc/siswaHandler.js`) melalui `ipcMain.handle`.
  4. Backend mengeksekusi *query SQLite* dan mengembalikan *Promise JSON* berformat `{ success: true/false, message: "...", data: [...] }`.

## 4. Panduan Tema & Styling UI (Penting!)
Aplikasi ini menggunakan tema **Soft Green & Orange**. Jika Anda menambahkan elemen atau halaman baru, **WAJIB** mengikuti panduan warna kustom berikut yang tertanam di `<style>` HTML:

* **Primary Color (Tombol, Badge, Aksen Aktif):** Soft Orange (`#f4a261`). Saat di-hover: `#e76f51`.
* **Sidebar & Header Utama:** Soft Green (`#40916c`).
* **Sidebar Hover:** Dark Green (`#2d6a4f`).
* **Teks & Ikon Sidebar Inaktif:** Putih transparan `rgba(255, 255, 255, 0.85)`.
* **Garis Pembatas (Divider):** Putih transparan `rgba(255, 255, 255, 0.3)`.
* Dilarang menggunakan warna bawaan Bootstrap (`bg-primary` biru asli) tanpa di-*override* via CSS variables (`--bs-primary`).

## 5. Sistem Logging (Catatan Aktivitas)
Setiap aktivitas kritis (Login, Logout, Tambah/Edit/Hapus Data, Export Laporan, Pembayaran SPP) **WAJIB** dicatat.
* **Dari Backend (IPC):** Gunakan fungsi `writeLog` yang di-import dari `../../main/logger`.
  * *Contoh:* `writeLog('Data Siswa', 'Tambah', 'Sukses', 'Berhasil menambahkan siswa Budi');`
* **Dari Frontend (Controllers):** Gunakan `window.api.tambahLog`.
  * *Contoh:* `window.api.tambahLog({ modul: 'Otentikasi', tindakan: 'Logout', status: 'Sukses', detail: 'Admin logout' });`
* Data log disimpan dalam format CSV secara persisten di folder sistem Windows (`%APPDATA%/spp-al-hikmah/Log_Aktivitas.csv`).

## 6. Penanganan Laporan & PDF
* Fitur *Export to PDF* menggunakan fungsi **jsPDF**.
* Logo sekolah / yayasan pada kuitansi dan laporan diambil dengan trik perenderan **Canvas HTML**. Sistem men-scan `<img src="..">` dari elemen sidebar (`.sidebar img`), mengubahnya menjadi *Base64 PNG URL*, barulah disuntikkan ke dokumen PDF.
* Jika mengganti logo, cukup ubah file gambar yang dirujuk di file `.html`, PDF otomatis akan menggunakan logo yang sama.

## 7. Pengembangan & Pengujian Berkelanjutan (Unit Testing)
Sebelum kode diluncurkan (*commit*/*deploy*), setiap *Developer* **WAJIB** memastikan logika aplikasi tidak rusak.
* Buka terminal di folder project utama.
* Ketik perintah: `npm test`
* Perintah ini akan mengeksekusi `node helper/test.js`. Pastikan *Output* menunjukkan semua modul (Siswa, Kelas, Tahun Ajaran, Login, Dashboard, dll) berstatus **[PASS] 100% Lulus**.
* Jika ingin memperbarui kolom template Excel (*Import Siswa*), cukup ubah dan eksekusi `node helper/generateTemplate.js`.

---
*Dibuat khusus untuk memastikan standar tinggi pengembangan sistem SPP Yayasan Al-Hikmah tetap terjaga.*
