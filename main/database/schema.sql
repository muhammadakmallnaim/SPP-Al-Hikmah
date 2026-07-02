-- Tabel users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK(role IN ('admin', 'bendahara')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel tahun_ajaran
CREATE TABLE IF NOT EXISTS tahun_ajaran (
    id SERIAL PRIMARY KEY,
    nama_tahun_ajaran VARCHAR(255) NOT NULL,
    semester VARCHAR(50) CHECK(semester IN ('Ganjil', 'Genap')) NOT NULL,
    status_aktif BOOLEAN NOT NULL DEFAULT false
);

-- Tabel kelas
CREATE TABLE IF NOT EXISTS kelas (
    id SERIAL PRIMARY KEY,
    nama_kelas VARCHAR(255) NOT NULL,
    tingkat INTEGER NOT NULL,
    wali_kelas VARCHAR(255)
);

-- Tabel siswa
CREATE TABLE IF NOT EXISTS siswa (
    id SERIAL PRIMARY KEY,
    nis VARCHAR(100) UNIQUE NOT NULL,
    nisn VARCHAR(100),
    nama_siswa VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(10) CHECK(jenis_kelamin IN ('L', 'P')) NOT NULL,
    tempat_lahir VARCHAR(255),
    tanggal_lahir DATE,
    alamat TEXT,
    nama_orang_tua VARCHAR(255),
    no_hp_orang_tua VARCHAR(50),
    kelas_id INTEGER,
    tahun_masuk INTEGER,
    status VARCHAR(50) CHECK(status IN ('aktif', 'lulus', 'pindah', 'keluar')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kelas_id) REFERENCES kelas(id)
);

-- Tabel pengaturan_spp
CREATE TABLE IF NOT EXISTS pengaturan_spp (
    id SERIAL PRIMARY KEY,
    kelas_id INTEGER NOT NULL,
    tahun_ajaran_id INTEGER NOT NULL,
    nominal_spp REAL NOT NULL,
    jatuh_tempo_tanggal INTEGER NOT NULL CHECK(jatuh_tempo_tanggal BETWEEN 1 AND 31),
    FOREIGN KEY (kelas_id) REFERENCES kelas(id),
    FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran(id)
);

-- Tabel pembayaran_spp
CREATE TABLE IF NOT EXISTS pembayaran_spp (
    id SERIAL PRIMARY KEY,
    no_transaksi VARCHAR(100) UNIQUE NOT NULL,
    siswa_id INTEGER NOT NULL,
    tahun_ajaran_id INTEGER NOT NULL,
    bulan_dibayar VARCHAR(50) NOT NULL,
    tanggal_pembayaran TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nominal_dibayar REAL NOT NULL,
    status_pembayaran VARCHAR(50) DEFAULT 'Lunas',
    kasir_id INTEGER NOT NULL,
    FOREIGN KEY (siswa_id) REFERENCES siswa(id),
    FOREIGN KEY (tahun_ajaran_id) REFERENCES tahun_ajaran(id),
    FOREIGN KEY (kasir_id) REFERENCES users(id)
);
