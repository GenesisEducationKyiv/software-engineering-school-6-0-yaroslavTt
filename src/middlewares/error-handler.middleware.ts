import { Request, Response, NextFunction } from 'express';
import { HttpException } from '@exceptions/http.exception';

export function errorHandler(err: HttpException, _req: Request, res: Response, _next: NextFunction): void {
    const status = err.status ?? 500;
    if (status >= 500) {
        console.error('[error]', err);
    }
    res.status(status).json({ error: err.message || 'Internal server error' });
}
