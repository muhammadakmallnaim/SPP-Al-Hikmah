const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let userDataPath;
try {
    const { app } = require('electron');
    if (app && app.getPath) {
        userDataPath = app.getPath('userData');
    } else {
        userDataPath = __dirname;
    }
} catch (error) {
    userDataPath = __dirname;
}

const dbPath = path.join(userDataPath, 'database.sqlite');
let dbInstance;

async function getDB() {
    if (!dbInstance) {
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        await dbInstance.exec('PRAGMA foreign_keys = ON');
    }
    return dbInstance;
}

async function initDB() {
    const db = await getDB();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schema);
    console.log('Database terinisialisasi dan tabel berhasil dibuat.');
}

module.exports = {
    getDB,
    initDB,
    dbPath
};
