import { startNotifierConsumer } from './consumer';

startNotifierConsumer().catch((err) => {
    console.error('[Notifier]: Fatal error.', err);
    process.exit(1);
});
