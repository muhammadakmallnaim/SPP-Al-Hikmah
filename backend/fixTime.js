const { getDB } = require('./main/database/db.js');

async function fixTimezone() {
    const db = await getDB();
    try {
        await db.exec(`ALTER DATABASE postgres SET timezone TO 'Asia/Jakarta';`);
        console.log('Timezone default database berhasil diubah ke Asia/Jakarta.');
        
        // Ubah semua tipe kolom dari timestamp tanpa zona waktu ke timestamptz
        await db.exec(`
            ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC', ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
            ALTER TABLE siswa ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC', ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
            ALTER TABLE pembayaran_spp ALTER COLUMN tanggal_pembayaran TYPE TIMESTAMPTZ USING tanggal_pembayaran AT TIME ZONE 'UTC';
            ALTER TABLE riwayat_kelas ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
        `);
        console.log('Kolom timestamp berhasil diupgrade ke TIMESTAMPTZ.');
    } catch (e) {
        console.error(e);
    }
}

fixTimezone().then(() => process.exit(0));
