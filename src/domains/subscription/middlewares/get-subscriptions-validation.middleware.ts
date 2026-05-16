import { ValidationException } from '@exceptions/validation.exception';
import { EMAIL_RE } from '../constants';
import type { Request, Response, NextFunction } from 'express';
import type { GetSubscriptionsQueryParams } from '../dto/get-subscriptions-query-params.dto';

export function validateGetSubscriptions(
    req: Request<unknown, unknown, unknown, GetSubscriptionsQueryParams>,
    _res: Response,
    next: NextFunction,
): void {
    const { email } = req.query;
    if (!email) throw new ValidationException('email query parameter is required');
    if (!EMAIL_RE.test(email)) throw new ValidationException('Invalid email format');
    next();
}
