import cron from 'node-cron';
import { environmentConfig } from '@config/environment';
import type { IScannerService } from './interface/scanner.service.interface';
import { scanDurationSeconds } from '@utilities/metrics';
import { logger } from '@config/logger';

export class ScannerScheduler {
    constructor(private readonly scannerService: IScannerService) {}

    start(): void {
        cron.schedule(environmentConfig.cronSchedule, async () => {
            try {
                const timer = scanDurationSeconds.startTimer();
                await this.scannerService.scan();
                timer();
            } catch (err) {
                logger.error({ err }, '[scanner] Unexpected error during scan');
            }
        });
    }
}
