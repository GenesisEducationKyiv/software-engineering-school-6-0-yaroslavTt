import { HttpException } from './http.exception';

export class ValidationException extends HttpException {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'ValidationException', 400, context);
    }
}
