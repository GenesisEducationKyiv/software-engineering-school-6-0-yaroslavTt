jest.mock('node-cron', () => ({ schedule: jest.fn() }));
import cron from 'node-cron';
import { ScannerScheduler } from './scanner.scheduler';
import type { IScannerService } from './interface/scanner.service.interface';

let mockScannerService: jest.Mocked<IScannerService>;
let scheduler: ScannerScheduler;

describe('ScannerScheduler', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockScannerService = { scan: jest.fn() };
        scheduler = new ScannerScheduler(mockScannerService);
    });

    describe('start', () => {
        it('schedules scan on the configured cron expression', () => {
            scheduler.start();
            expect(cron.schedule).toHaveBeenCalledWith(expect.any(String), expect.any(Function));
        });

        it('calls scan() when cron fires', async () => {
            mockScannerService.scan.mockResolvedValue(undefined);
            scheduler.start();

            const callback = (cron.schedule as jest.Mock).mock.calls[0][1];
            await callback();

            expect(mockScannerService.scan).toHaveBeenCalledTimes(1);
        });

        it('swallows unexpected errors thrown by scan() so cron keeps running', async () => {
            mockScannerService.scan.mockRejectedValue(new Error('DB down'));
            scheduler.start();

            const callback = (cron.schedule as jest.Mock).mock.calls[0][1];
            await expect(callback()).resolves.toBeUndefined();
        });
    });
});
