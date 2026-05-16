import { HttpException } from './http.exception';

export class NotFoundException extends HttpException {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'NotFoundException', 404, context);
    }
}
