import { logger } from '@config/logger';
import { startScanner } from './scanner';

startScanner().catch((err) => {
    logger.error({ err }, '[Scanner]: Fatal error.');
    process.exit(1);
});
