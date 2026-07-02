const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Koneksi ke Supabase PostgreSQL via Shared Pooler (IPv4)
const connectionString = 'postgresql://postgres.bisogcgwshtxtwdeghgg:SPP-Al-Hikmah@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
let pool;

async function getDB() {
    if (!pool) {
        pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false }
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
