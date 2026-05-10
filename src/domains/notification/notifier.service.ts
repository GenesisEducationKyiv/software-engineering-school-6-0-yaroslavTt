import type { Transporter } from 'nodemailer';
import { environmentConfig } from '@config/environment';
import type { INotifierService } from './interface/notifier.service.interface';
import type { IEmailTemplateBuilder } from './interface/email-template-builder.interface';

export class NotifierService implements INotifierService {
    constructor(
        private readonly transporter: Transporter,
        private readonly emailTemplateBuilder: IEmailTemplateBuilder,
    ) {}

    async sendConfirmationEmail(params: {
        to: string;
        owner: string;
        repo: string;
        confirmUrl: string;
    }): Promise<void> {
        const { to, owner, repo, confirmUrl } = params;

        await this.transporter.sendMail({
            from: environmentConfig.emailFrom,
            to,
            ...this.emailTemplateBuilder.confirmationEmail({ owner, repo, confirmUrl }),
        });
    }

    async sendReleaseEmail(params: {
        to: string;
        owner: string;
        repo: string;
        tagName: string;
        releaseName: string;
        releaseUrl: string;
        unsubscribeUrl: string;
    }): Promise<void> {
        const { to, owner, repo, tagName, releaseName, releaseUrl, unsubscribeUrl } = params;

        await this.transporter.sendMail({
            from: environmentConfig.emailFrom,
            to,
            ...this.emailTemplateBuilder.releaseEmail({
                owner,
                repo,
                tagName,
                releaseName,
                releaseUrl,
                unsubscribeUrl,
            }),
        });
    }
}
