import type { Transporter } from 'nodemailer';
import { NotifierService } from './notifier.service';
import { createMockEmailTemplateBuilder } from '@test/mock-utils';

const mockTemplateBuilder = createMockEmailTemplateBuilder();
let mockTransporter: jest.Mocked<Pick<Transporter, 'sendMail'>>;
let notifierService: NotifierService;

describe('NotifierService', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockTemplateBuilder.confirmationEmail.mockReturnValue({ subject: 'subject', html: '<p>html</p>' });
        mockTemplateBuilder.releaseEmail.mockReturnValue({ subject: 'subject', html: '<p>html</p>' });
        mockTransporter = { sendMail: jest.fn().mockResolvedValue(undefined) };
        notifierService = new NotifierService(mockTransporter as unknown as Transporter, mockTemplateBuilder);
    });

    describe('sendConfirmationEmail', () => {
        it('delegates to template builder and sends the result', async () => {
            await notifierService.sendConfirmationEmail({
                to: 'u@e.com',
                owner: 'a',
                repo: 'b',
                confirmUrl: 'http://c',
                unsubscribeUrl: 'http://u',
            });

            expect(mockTemplateBuilder.confirmationEmail).toHaveBeenCalledWith({
                owner: 'a',
                repo: 'b',
                confirmUrl: 'http://c',
                unsubscribeUrl: 'http://u',
            });
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({ to: 'u@e.com', subject: 'subject', html: '<p>html</p>' }),
            );
        });
    });

    describe('sendReleaseEmail', () => {
        it('delegates to template builder and sends the result', async () => {
            await notifierService.sendReleaseEmail({
                to: 'u@e.com',
                owner: 'a',
                repo: 'b',
                tagName: 'v1.0',
                releaseName: 'Release',
                releaseUrl: 'http://r',
                unsubscribeUrl: 'http://u',
            });

            expect(mockTemplateBuilder.releaseEmail).toHaveBeenCalledWith({
                owner: 'a',
                repo: 'b',
                tagName: 'v1.0',
                releaseName: 'Release',
                releaseUrl: 'http://r',
                unsubscribeUrl: 'http://u',
            });
            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({ to: 'u@e.com', subject: 'subject', html: '<p>html</p>' }),
            );
        });
    });
});
