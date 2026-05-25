import { CryptoTokenGenerator } from './crypto-token-generator';

const generator = new CryptoTokenGenerator();

describe('CryptoTokenGenerator', () => {
    describe('generate', () => {
        it('returns a 64-character hex string', () => {
            const token = generator.generate();
            expect(typeof token).toBe('string');
            expect(token).toHaveLength(64);
            expect(token).toMatch(/^[a-f0-9]+$/);
        });

        it('returns unique values on each call', () => {
            const a = generator.generate();
            const b = generator.generate();
            expect(a).not.toBe(b);
        });
    });
});
