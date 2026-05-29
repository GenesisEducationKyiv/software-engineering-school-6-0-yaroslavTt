import { httpRequestDurationSeconds, httpRequestsTotal } from '@utilities/metrics/prom';
import type { NextFunction, Request, Response } from 'express';

export function requestMonitoring(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
        const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;
        const metricsLabels = { method: req.method, route: req.route?.path ?? req.path, status_code: res.statusCode };

        httpRequestDurationSeconds.observe(metricsLabels, durationSeconds);
        httpRequestsTotal.inc(metricsLabels, 1);
    });

    next();
}
