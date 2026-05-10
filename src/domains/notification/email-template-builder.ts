import type { IEmailTemplateBuilder } from './interface/email-template-builder.interface';

export class EmailTemplateBuilder implements IEmailTemplateBuilder {
    confirmationEmail(params: { owner: string; repo: string; confirmUrl: string }): { subject: string; html: string } {
        const { owner, repo, confirmUrl } = params;

        return {
            subject: `Confirm your subscription to ${owner}/${repo} releases`,
            html: `
                <p>You requested to subscribe to release notifications for <strong>${owner}/${repo}</strong>.</p>
                <p><a href="${confirmUrl}">Click here to confirm your subscription</a></p>
                <p>If you did not request this, you can safely ignore this email.</p>
            `,
        };
    }

    releaseEmail(params: {
        owner: string;
        repo: string;
        tagName: string;
        releaseName: string;
        releaseUrl: string;
        unsubscribeUrl: string;
    }): { subject: string; html: string } {
        const { owner, repo, tagName, releaseName, releaseUrl, unsubscribeUrl } = params;

        return {
            subject: `New release: ${owner}/${repo} — ${tagName}`,
            html: `
                <p>A new release of <strong><a href="https://github.com/${owner}/${repo}">${owner}/${repo}</a></strong> is available.</p>
                <p><strong>Tag:</strong> ${tagName}</p>
                <p><strong>Name:</strong> ${releaseName}</p>
                <p><a href="${releaseUrl}">View release on GitHub</a></p>
                <hr/>
                <p style="font-size:12px"><a href="${unsubscribeUrl}">Unsubscribe</a></p>
            `,
        };
    }
}
