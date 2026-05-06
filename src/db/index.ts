import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { environmentConfig } from '../config/environment.js';

export const pool = new Pool({
    connectionString: environmentConfig.databaseUrl,
});

export async function runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            console.log(`[db] Running migration: ${file}`);
            await client.query(sql);
        }
        await client.query('COMMIT');
        console.log('[db] Migrations complete');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
