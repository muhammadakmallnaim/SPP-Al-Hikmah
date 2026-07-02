-- Tabel users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'bendahara')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel tahun_ajaran
CREATE TABLE IF NOT EXISTS tahun_ajaran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_tahun_ajaran TEXT NOT NULL,
    semester TEXT CHECK(semester IN ('Ganjil', 'Genap')) NOT NULL,
    status_aktif BOOLEAN NOT NULL DEFAULT 0
);

-- Tabel kelas
CREATE TABLE IF NOT EXISTS kelas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_kelas TEXT NOT NULL,
    tingkat INTEGER NOT NULL,
    wali_kelas TEXT
);

-- Tabel siswa
CREATE TABLE IF NOT EXISTS siswa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nis TEXT UNIQUE NOT NULL,
    nisn TEXT,
    nama_siswa TEXT NOT NULL,
    jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L', 'P')) NOT NULL,
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    alamat TEXT,
    nama_orang_tua TEXT,
    no_hp_orang_tua TEXT,
    kelas_id INTEGER,
    tahun_masuk INTEGER,
    status TEXT CHECK(status IN ('aktif', 'lulus', 'pindah', 'keluar')) NOT NULL,
    FOREIGN KEY (kelas_id) REFERENCES kelas(id)
);

-- Tabel pengaturan_spp
CREATE TABLE IF NOT EXISTS pengaturan_spp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kelas_id INTEGER NOT NULL,
    tahun_ajaran_id INTEGER NOT NULL,
    nominal_spp REAL NOT NULL,
    jatuh_tempo_tanggal INTEGER NOT NULL CHECK(jatuh_tempo_tanggal BETWEEN 1 AND 31),
    FOREIGN KEY (kelas_id) REFERENCES kelas(id),
    FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran(id)
);

-- Tabel pembayaran_spp (Simplified model)
CREATE TABLE IF NOT EXISTS pembayaran_spp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    no_transaksi TEXT UNIQUE NOT NULL,
    siswa_id INTEGER NOT NULL,
    tahun_ajaran_id INTEGER NOT NULL,
    bulan_dibayar TEXT NOT NULL,
    tanggal_pembayaran DATETIME DEFAULT CURRENT_TIMESTAMP,
    nominal_dibayar REAL NOT NULL,
    status_pembayaran TEXT DEFAULT 'Lunas',
    kasir_id INTEGER NOT NULL,
    FOREIGN KEY (siswa_id) REFERENCES siswa(id),
    FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran(id),
    FOREIGN KEY (kasir_id) REFERENCES users(id)
);
