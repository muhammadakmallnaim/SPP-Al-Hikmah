# Panduan Pengembangan Aplikasi SPP Al-Hikmah

Dokumen ini merupakan panduan lengkap mengenai arsitektur, teknologi, dan alur kerja untuk pengembangan lanjutan aplikasi SPP Al-Hikmah. Panduan ini bertujuan agar pengembangan ke depan tetap konsisten dan tidak melenceng dari struktur yang sudah dibangun.

## 1. Teknologi & Arsitektur
Aplikasi ini dikembangkan menggunakan teknologi berbasis web desktop:
* **Framework Utama:** Electron.js (menjalankan aplikasi desktop dengan teknologi web).
* **Backend / IPC (Main Process):** Node.js menggunakan sistem `ipcMain` dan `ipcRenderer` untuk komunikasi antara UI dan database.
* **Frontend (Renderer Process):** HTML5, CSS3, dan Vanilla JavaScript. Styling menggunakan framework **Bootstrap 5** dan **FontAwesome**.
* **Database:** PostgreSQL (Cloud / Remote) terintegrasi menggunakan library `pg`. Data tersimpan secara terpusat dan real-time.

## 2. Struktur Direktori
Pastikan Anda memahami lokasi file sebelum mengedit:
* `main/` : Berisi proses utama Electron.
  * `main.js` : Entry point aplikasi, inisialisasi window dan handler.
  * `preload.js` : Menjembatani IPC antara renderer dan main process (`window.api`).
  * `database/db.js` : Koneksi SQLite.
* `src/ipc/` : Handler database untuk setiap entitas (Siswa, Kelas, Tahun Ajaran, SPP, Pembayaran, Laporan).
* `src/views/` : File UI HTML. Masing-masing file mewakili satu layar.
* `src/controllers/` : File logika JavaScript untuk frontend. Mengatur event listener dan DOM manipulation.
* `assets/` : Gambar, logo, dan file statis lainnya.

## 3. Alur Komunikasi (Front-end ke Back-end)
Aplikasi ini DILARANG melakukan koneksi database langsung dari file `.js` di folder `src/controllers/`. Alur yang benar adalah:
1. **Frontend (`controllers/`)**: Memanggil fungsi API dari `window.api` (misalnya `window.api.getSiswa()`).
2. **Preload (`main/preload.js`)**: Meneruskan pemanggilan tersebut melalui `ipcRenderer.invoke('get-siswa')`.
3. **Backend (`src/ipc/`)**: Menerima request lewat `ipcMain.handle`, memproses query ke database PostgreSQL, dan mengembalikan data dalam format JSON/Object.

## 4. Standar UI/UX
* **Desain:** Menggunakan pendekatan modern. Sidebar berwarna gelap (`#2b3a4a`), konten berwarna terang, dan menggunakan kartu (card) dengan shadow ringan (`shadow-sm`, `border-0`).
* **Font:** Menggunakan font *Inter*.
* **Notifikasi:** Semua alert/notifikasi sukses atau gagal harus menggunakan sistem Toaster (`showToast` dari `toast.js`), JANGAN menggunakan `alert()` bawaan browser yang memblokir layar.
* **Layout:** Pastikan UI selalu responsif. Gunakan grid Bootstrap (`row`, `col`) agar komponen otomatis menyesuaikan saat window di-resize.

## 5. Panduan Build (Export ke `.exe`)
Jika ada perubahan besar, jangan lupa menguji hasil akhir dengan mem-build ulang aplikasi:
1. Pastikan Anda sudah menguji di mode pengembangan (`npm start`).
2. Buka Terminal/PowerShell sebagai **Administrator**.
3. Arahkan ke folder project `cd /d "d:\9. Project Ku\app-spp\spp-al-hikmah"`
4. Ketik: `npm run build`
5. File installer `.exe` akan selalu masuk ke dalam folder `dist/`.

Atau 

Langkah 1: Tutup Aplikasi
Pastikan tidak ada aplikasi SPP Al-Hikmah yang sedang menyala di latar belakang. Tutup semua jendela aplikasinya jika ada.

Langkah 2: Buka Terminal sebagai Administrator
1. Klik menu Start Windows (logo Windows di pojok kiri bawah).
2. Ketik "cmd" atau "Command Prompt".
3. Klik kanan pada "Command Prompt" yang muncul, lalu pilih "Run as Administrator" (Jalankan sebagai administrator).
4. Jika muncul kotak peringatan keamanan (UAC), klik "Yes".

Langkah 3: Masuk ke Folder Project
Di layar hitam Command Prompt yang baru terbuka, ketik perintah berikut persis seperti ini, lalu tekan Enter:
cd /d "d:\9. Project Ku\app-spp\spp-al-hikmah"

Langkah 4: Jalankan Perintah Build
Setelah berhasil masuk ke folder tersebut, ketik perintah berikut dan tekan Enter:
npm run build

Langkah 5: Tunggu dan Ambil Hasilnya
Biarkan proses berjalan (biasanya butuh waktu sekitar 1-3 menit). 
Setelah selesai dan berhasil 100%, Anda bisa menutup layar hitam tersebut.

Buka File Explorer, lalu cari file installernya di dalam folder ini:
d:\9. Project Ku\app-spp\spp-al-hikmah\dist

Anda akan menemukan file bernama "SPP Al-Hikmah Setup 1.0.0.exe". File itulah yang siap Anda copy ke flashdisk dan diinstal di komputer admin/kasir manapun!


## 6. Panduan Unit Testing
Untuk memastikan semua modul (Database, Login, Siswa, Kelas, Laporan, dll) berjalan dengan baik tanpa error, jalankan Unit Test secara otomatis:
1. Buka Terminal/Command Prompt di folder project.
2. Ketik perintah: `npm test`
3. Sistem akan menguji 14 tahapan krusial dan memberikan laporan LULUS/GAGAL dalam hitungan detik.

## 7. Panduan Generate Template Import Excel
Jika sewaktu-waktu file template Excel (`Template_Import_Siswa.xlsx`) hilang atau terhapus, Anda bisa membuatnya ulang dengan fitur generator otomatis:
1. Buka Terminal/Command Prompt di folder project.
2. Ketik perintah: `node helper/generateTemplate.js`
3. File Excel yang baru, rapi, dan dilengkapi proteksi dropdown otomatis akan langsung terbuat ulang di dalam folder project.

## 8. Catatan Penting Lainnya
* **File Kuitansi / PDF:** Menggunakan fitur *native* dari Electron (`webContents.printToPDF`) untuk Tunggakan dan library tambahan seperti `jspdf` atau `XLSX` untuk Laporan/Export Data. Ekspor kini langsung difasilitasi dengan *Save Dialog* murni lewat backend.
* **Database Persistensi:** Karena sekarang sudah beralih menggunakan PostgreSQL Cloud, backup data dilakukan langsung dari panel penyedia database (contoh: Supabase). Aplikasi ini berjalan *stateless* secara lokal.
* **Penamaan ID & Class:** Gunakan penamaan yang logis dan konsisten di HTML agar mudah diikat (`binding`) oleh JavaScript di sisi controller.

## 9. Manajemen Akses (RBAC) & Role
Aplikasi ini sudah mengimplementasikan Role-Based Access Control (RBAC) di sisi frontend dan backend:
* **Admin:** Hak akses penuh (Superuser) ke seluruh menu aplikasi termasuk *Data User*.
* **Kepala Sekolah:** Hanya bisa melihat menu **Laporan**, **Tunggakan**, **Pengaturan Akun**, dan **Logout**. Jika mencoba mengakses menu terlarang secara manual lewat URL, akan otomatis diarahkan kembali (Redirect) ke menu Laporan melalui injeksi logic `auth.js`.
* Backend dan UI secara otomatis menyembunyikan navigasi (*sidebar*) yang terlarang sesuai identitas *role* di `sessionStorage.getItem('user')`.
