import nodemailer, { Transporter } from 'nodemailer';
import { environmentConfig } from '../config/environment.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: environmentConfig.smtpHost,
            port: environmentConfig.smtpPort,
            auth: {
                user: environmentConfig.smtpUser,
                pass: environmentConfig.smtpPass,
            },
        });
    }
    return transporter;
}

// Allows tests to inject a mock transporter
export function setTransporter(t: Transporter): void {
    transporter = t;
}

export async function sendConfirmationEmail(params: {
    to: string;
    owner: string;
    repo: string;
    confirmUrl: string;
}): Promise<void> {
    const { to, owner, repo, confirmUrl } = params;
    await getTransporter().sendMail({
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

export async function sendReleaseEmail(params: {
    to: string;
    owner: string;
    repo: string;
    tagName: string;
    releaseName: string;
    releaseUrl: string;
    unsubscribeUrl: string;
}): Promise<void> {
    const { to, owner, repo, tagName, releaseName, releaseUrl, unsubscribeUrl } = params;
    await getTransporter().sendMail({
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
