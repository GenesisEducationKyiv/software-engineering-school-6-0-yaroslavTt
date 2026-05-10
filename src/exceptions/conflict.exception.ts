import { HttpException } from './http.exception';

export class ConflictException extends HttpException {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'ConflictException', 409, context);
    }
}
