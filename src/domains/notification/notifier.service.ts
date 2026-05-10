import { Transporter } from 'nodemailer';
import { environmentConfig } from '@config/environment';
import type { INotifierService } from './interface/notifier.service.interface';

export class NotifierService implements INotifierService {
    constructor(private readonly transporter: Transporter) {}

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
            subject: `Confirm your subscription to ${owner}/${repo} releases`,
            html: `
                <p>You requested to subscribe to release notifications for <strong>${owner}/${repo}</strong>.</p>
                <p><a href="${confirmUrl}">Click here to confirm your subscription</a></p>
                <p>If you did not request this, you can safely ignore this email.</p>
            `,
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
            subject: `New release: ${owner}/${repo} — ${tagName}`,
            html: `
                <p>A new release of <strong><a href="https://github.com/${owner}/${repo}">${owner}/${repo}</a></strong> is available.</p>
                <p><strong>Tag:</strong> ${tagName}</p>
                <p><strong>Name:</strong> ${releaseName}</p>
                <p><a href="${releaseUrl}">View release on GitHub</a></p>
                <hr/>
                <p style="font-size:12px"><a href="${unsubscribeUrl}">Unsubscribe</a></p>
            `,
        });
    }
}
