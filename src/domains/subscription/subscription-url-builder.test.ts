jest.mock('@config/environment', () => ({
    environmentConfig: { appBaseUrl: 'http://localhost:3000' },
}));

import { SubscriptionUrlBuilder } from './subscription-url-builder';

const builder = new SubscriptionUrlBuilder();

describe('SubscriptionUrlBuilder', () => {
    describe('confirmUrl', () => {
        it('builds confirm URL', () => {
            expect(builder.confirmUrl('abc123')).toBe('http://localhost:3000/confirm?token=abc123');
        });
    });

    describe('unsubscribeUrl', () => {
        it('builds unsubscribe URL', () => {
            expect(builder.unsubscribeUrl('abc123')).toBe('http://localhost:3000/unsubscribe?token=abc123');
        });
    });
});
