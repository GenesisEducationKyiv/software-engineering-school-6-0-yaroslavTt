import { logger } from '@config/logger';
import { startNotifierConsumer } from './consumer';

startNotifierConsumer().catch((err) => {
    logger.error({ err }, '[Notifier]: Fatal error.');
    process.exit(1);
});

process.on('SIGTERM', () => {
    logger.info('[Notifier]: Shutting down.');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('[Notifier]: Shutting down.');
    process.exit(0);
});
