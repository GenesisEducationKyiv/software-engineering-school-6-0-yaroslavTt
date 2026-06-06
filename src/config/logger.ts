import pino from 'pino';
import { environmentConfig } from './environment';

export const logger = pino({
    level: environmentConfig.nodeEnv === 'production' ? 'info' : 'debug',
    ...(environmentConfig.nodeEnv === 'development' && {
        transport: {
            target: 'pino-pretty',
        },
    }),
});
