import { EmailTemplateBuilder } from './email-template-builder';

const builder = new EmailTemplateBuilder();

describe('confirmationEmail', () => {
    const params = { owner: 'golang', repo: 'go', confirmUrl: 'http://example.com/confirm/abc' };

    it('returns correct subject', () => {
        const { subject } = builder.confirmationEmail(params);
        expect(subject).toBe('Confirm your subscription to golang/go releases');
    });

    it('includes owner/repo and confirmUrl in html', () => {
        const { html } = builder.confirmationEmail(params);
        expect(html).toContain('golang/go');
        expect(html).toContain('http://example.com/confirm/abc');
    });
});

describe('releaseEmail', () => {
    const params = {
        owner: 'golang',
        repo: 'go',
        tagName: 'v1.22.0',
        releaseName: 'Go 1.22',
        releaseUrl: 'http://example.com/release',
        unsubscribeUrl: 'http://example.com/unsubscribe/tok',
    };

    it('returns correct subject', () => {
        const { subject } = builder.releaseEmail(params);
        expect(subject).toBe('New release: golang/go — v1.22.0');
    });

    it('includes tag, release name, releaseUrl and unsubscribeUrl in html', () => {
        const { html } = builder.releaseEmail(params);
        expect(html).toContain('v1.22.0');
        expect(html).toContain('Go 1.22');
        expect(html).toContain('http://example.com/release');
        expect(html).toContain('http://example.com/unsubscribe/tok');
    });
});
