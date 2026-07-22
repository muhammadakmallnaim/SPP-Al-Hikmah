const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') }); // Load dari root backend

// Koneksi ke Supabase PostgreSQL via Shared Pooler (IPv4)
const connectionString = process.env.DATABASE_URL;
let pool;

async function getDB() {
    if (!pool) {
        if (!connectionString) {
            console.error('ERROR: DATABASE_URL tidak ditemukan di .env!');
        }
        pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 20, // Membatasi jumlah maksimal koneksi untuk mencegah kelebihan beban / memory leak
            idleTimeoutMillis: 30000, // Koneksi yang tidak aktif selama 30 detik akan ditutup (mencegah memory leak)
            connectionTimeoutMillis: 5000 // Waktu maksimal tunggu koneksi (kecepatan)
        });
        
        // Error handling pada pool idle untuk mencegah aplikasi crash jika database terputus
        pool.on('error', (err, client) => {
            console.error('Unexpected error on idle database client', err);
            // Aplikasi tidak perlu crash, pool akan reconnect otomatis saat dibutuhkan
        });
    }
    
    // Fungsi pintar: Mengubah query SQLite (?) menjadi query PostgreSQL ($1, $2, $3) secara otomatis
    const convertQuery = (sql) => {
        let count = 1;
        return sql.replace(/\?/g, () => `$${count++}`);
    };

    return {
        get: async (sql, params = []) => {
            const res = await pool.query(convertQuery(sql), params);
            return res.rows[0];
        },
        all: async (sql, params = []) => {
            const res = await pool.query(convertQuery(sql), params);
            return res.rows;
        },
        run: async (sql, params = []) => {
            let modifiedSql = convertQuery(sql);
            // Jika ini operasi INSERT, kita butuh mengembalikan 'id' untuk menyesuaikan standar return object sqlite3 (info.lastID)
            if (modifiedSql.trim().toUpperCase().startsWith('INSERT') && !modifiedSql.toUpperCase().includes('RETURNING')) {
                modifiedSql += ' RETURNING id';
            }
            const res = await pool.query(modifiedSql, params);
            const lastID = (res.rows && res.rows.length > 0 && res.rows[0].id) ? res.rows[0].id : null;
            return { changes: res.rowCount, lastID };
        },
        exec: async (sql) => {
            return pool.query(sql);
        }
    };
}

async function initDB() {
    const db = await getDB();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    try {
        await db.exec(schema);
        console.log('Database PostgreSQL Cloud terinisialisasi.');
        
        // Cek apakah admin sudah ada, jika belum buat admin default
        const adminCheck = await db.get('SELECT id FROM users LIMIT 1');
        if (!adminCheck) {
            const bcrypt = require('bcryptjs');
            const hash = await bcrypt.hash('admin123', 10);
            await db.run('INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)', ['admin', hash, 'Administrator', 'admin']);
            console.log('Admin default berhasil dibuat di Cloud.');
        }
    } catch (e) {
        console.error('Error saat inisialisasi Database Cloud:', e);
    }
}

module.exports = {
    getDB,
    initDB,
    dbPath: 'Supabase-PostgreSQL'
};
