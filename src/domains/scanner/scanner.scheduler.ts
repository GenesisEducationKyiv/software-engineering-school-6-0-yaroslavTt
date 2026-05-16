import cron from 'node-cron';
import { environmentConfig } from '@config/environment';
import type { IScannerService } from './interface/scanner.service.interface';
import { scanDurationSeconds } from '@utilities/metrics/prom';

export class ScannerScheduler {
    constructor(private readonly scannerService: IScannerService) {}

    start(): void {
        cron.schedule(environmentConfig.cronSchedule, async () => {
            try {
                const timer = scanDurationSeconds.startTimer();
                await this.scannerService.scan();
                timer();
            } catch (err) {
                console.error('[scanner] Unexpected error during scan:', err);
            }
        });
    }
}
