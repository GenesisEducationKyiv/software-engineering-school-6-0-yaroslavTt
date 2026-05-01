export class ValidationError extends Error {
    status = 400;
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends Error {
    status = 404;
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends Error {
    status = 409;
    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
    }
}

export class RateLimitError extends Error {
    status = 429;
    retryAfter: number | null;
    constructor(message: string, retryAfter: number | null = null) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}
