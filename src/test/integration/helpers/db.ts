import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runMigrations } from '@db/index';

let pool: Pool;

export async function startTestDb() {
    const container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({
        connectionString: container.getConnectionUri(),
    });
    await runMigrations(pool);
    return { pool, container };
}
