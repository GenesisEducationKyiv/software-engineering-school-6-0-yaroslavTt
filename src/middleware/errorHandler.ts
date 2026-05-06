import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../types/error.js';

export function errorHandler(err: HttpError, _req: Request, res: Response, _next: NextFunction): void {
    const status = err.status ?? 500;
    if (status >= 500) {
        console.error('[error]', err);
    }
    res.status(status).json({ error: err.message || 'Internal server error' });
}
