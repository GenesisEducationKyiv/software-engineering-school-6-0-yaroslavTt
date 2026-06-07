import { logger } from '@config/logger';
import { startScanner } from './scanner';

startScanner().catch((err) => {
    logger.error({ err }, '[Scanner]: Fatal error.');
    process.exit(1);
});

process.on('SIGTERM', () => {
    logger.info('[Scanner]: Shutting down.');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('[Scanner]: Shutting down.');
    process.exit(0);
});
