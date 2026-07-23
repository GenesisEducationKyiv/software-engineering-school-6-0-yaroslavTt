import { HttpException } from './http.exception';

export class RateLimitException extends HttpException {
    retryAfter: number | null;

    constructor(message: string, retryAfter: number | null = null, context?: Record<string, unknown>) {
        super(message, 'RateLimitException', 429, context);
        this.retryAfter = retryAfter;
    }
}
