export interface IRabbitMQService {
    connect(): Promise<void>;
    publish<T>(queue: string, message: T): Promise<void>;
    consume<T>(queue: string, handler: (message: T) => Promise<void>): Promise<void>;
}
