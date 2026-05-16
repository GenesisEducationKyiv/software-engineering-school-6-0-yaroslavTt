import { ValidationException } from '@exceptions/validation.exception';
import type { SubscribePayload } from '../dto/subscribe-payload.dto';
import { EMAIL_RE, REPO_RE } from '../constants';
import type { Request, Response, NextFunction } from 'express';

export function validateSubscribe(
    req: Request<unknown, unknown, SubscribePayload>,
    _res: Response,
    next: NextFunction,
): void {
    const { email, repo } = req.body;
    if (!EMAIL_RE.test(email)) {
        throw new ValidationException('Invalid email address');
    }
    if (!REPO_RE.test(repo)) {
        throw new ValidationException('Invalid repo format — expected owner/repo');
    }
    next();
}
