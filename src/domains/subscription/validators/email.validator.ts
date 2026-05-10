import { ValidationException } from '@exceptions/validation.exception';
import type { IValidator } from '@common/validator.interface';
import { EMAIL_RE } from './constants';

export class EmailValidator implements IValidator<string> {
    validate(value: string): void {
        if (!EMAIL_RE.test(value)) {
            throw new ValidationException('Invalid email address');
        }
    }
}
