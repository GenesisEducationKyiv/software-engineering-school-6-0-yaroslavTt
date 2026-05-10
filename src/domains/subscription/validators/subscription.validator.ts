import { ValidationException } from '@exceptions/validation.exception';
import type { IValidator } from '@common/interface/validator.interface';
import type { SubscribePayload } from '../dto/subscribe-payload.dto';
import { EMAIL_RE, REPO_RE } from './constants';

export class SubscriptionValidator implements IValidator<SubscribePayload> {
    validate(value: SubscribePayload): void {
        const { email, repo } = value;
        if (!EMAIL_RE.test(email)) {
            throw new ValidationException('Invalid email address');
        }
        if (!REPO_RE.test(repo)) {
            throw new ValidationException('Invalid repo format — expected owner/repo');
        }
    }
}
