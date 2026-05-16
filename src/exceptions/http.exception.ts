export class HttpException extends Error {
    context?: Record<string, unknown>;
    status: number;

    constructor(message: string, name: string, status: number, context?: Record<string, unknown>) {
        super(message);
        this.name = name;
        this.status = status;
        this.context = context;
    }
}
