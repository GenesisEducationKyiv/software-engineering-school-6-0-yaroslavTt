import { Request, Response, NextFunction } from 'express';
import { environmentConfig } from '../config/environment.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
    if (!environmentConfig.apiKey) {
        // API key not configured — auth disabled (dev mode)
        next();
        return;
    }
    const key = req.headers['x-api-key'];
    if (key !== environmentConfig.apiKey) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}
