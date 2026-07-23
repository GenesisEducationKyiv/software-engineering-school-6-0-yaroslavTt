import { logger } from '@config/logger';
import { startNotifierConsumer } from './consumer';

startNotifierConsumer().catch((err) => {
    logger.error({ err }, '[Notifier]: Fatal error.');
    process.exit(1);
});
