import type { Pool } from 'pg';
import type { ISagaRepository } from './interface/saga.repository.interface';
import type { Saga } from './dto/saga.dto';
import type { SagaType, SagaStatus } from './types';

export class SagaRepository implements ISagaRepository {
    constructor(private readonly pool: Pool) {}

    async create(params: { type: SagaType; status: SagaStatus; payload: unknown }): Promise<Saga> {
        const { type, status, payload } = params;

        const result = await this.pool.query<Saga>(
            `INSERT INTO sagas (type, status, payload)
            VALUES ($1, $2, $3)
            RETURNING *`,
            [type, status, JSON.stringify(payload)],
        );

        return result.rows[0];
    }

    async updateStatus(params: { id: string; status: SagaStatus }): Promise<void> {
        const { id, status } = params;

        await this.pool.query('UPDATE sagas SET status = $2, updated_at = NOW() WHERE id = $1', [id, status]);
    }

    async findById<T = Record<string, unknown>>(id: string): Promise<Saga<T> | null> {
        const result = await this.pool.query<Saga<T>>('SELECT * FROM sagas WHERE id = $1', [id]);
        return result.rows[0] ?? null;
    }
}
