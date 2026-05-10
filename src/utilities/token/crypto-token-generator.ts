import crypto from 'crypto';
import type { ITokenGenerator } from '../../common/interface/token-generator.interface';

export class CryptoTokenGenerator implements ITokenGenerator {
    generate(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}
