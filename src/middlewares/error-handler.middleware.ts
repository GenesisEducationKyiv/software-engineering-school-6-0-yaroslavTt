import type { Request, Response, NextFunction } from 'express';
import type { HttpException } from '@exceptions/http.exception';
import { logger } from '@config/logger';

export function errorHandler(err: HttpException, _req: Request, res: Response, _next: NextFunction): void {
    const status = err.status ?? 500;
    if (status >= 500) {
        logger.error({ err }, '[error]');
    }
    res.status(status).json({ error: err.message || 'Internal server error' });
}
