import cron from 'node-cron';
import { environmentConfig } from '@config/environment';
import type { IScannerService } from './interface/scanner.service.interface';

export class ScannerScheduler {
    constructor(private readonly scannerService: IScannerService) {}

    start(): void {
        cron.schedule(environmentConfig.cronSchedule, async () => {
            try {
                await this.scannerService.scan();
            } catch (err) {
                console.error('[scanner] Unexpected error during scan:', err);
            }
        });
    }
}
