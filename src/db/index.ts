import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { environmentConfig } from '@config/environment';
import { logger } from '@config/logger';

export const dbPool = new Pool({
    connectionString: environmentConfig.databaseUrl,
});

export async function runMigrations(pool: Pool): Promise<void> {
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
            logger.info({ file }, `[db] Running migration`);
            await client.query(sql);
        }
        await client.query('COMMIT');
        logger.info('[db] Migrations complete');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
