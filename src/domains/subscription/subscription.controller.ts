import { ValidationException } from '@exceptions/validation.exception';
import { EMAIL_RE } from './validators/constants';
import type { Request, Response, NextFunction } from 'express';
import type { SubscribePayload } from './dto/subscribe-payload.dto';
import type { RequestWithTokenParams } from './dto/confirm-subscription-params.dto';
import type { GetSubscriptionsQueryParams } from './dto/get-subscriptions-query-params.dto';
import type { ISubscriptionService } from './interface/subscription.service.interface';

export class SubscriptionController {
    constructor(private readonly subscriptionService: ISubscriptionService) {}

    async subscribe(
        req: Request<unknown, unknown, SubscribePayload>,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            await this.subscriptionService.subscribe(req.body);
            res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
        } catch (err) {
            next(err);
        }
    }

    async confirm(req: Request<RequestWithTokenParams>, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.subscriptionService.confirmSubscription(req.params.token);
            res.status(200).json({ message: 'Subscription confirmed successfully' });
        } catch (err) {
            next(err);
        }
    }

    async unsubscribe(req: Request<RequestWithTokenParams>, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.subscriptionService.unsubscribe(req.params.token);
            res.status(200).json({ message: 'Unsubscribed successfully' });
        } catch (err) {
            next(err);
        }
    }

    async getSubscriptions(
        req: Request<unknown, unknown, unknown, GetSubscriptionsQueryParams>,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        try {
            const { email } = req.query;
            if (!email) throw new ValidationException('email query parameter is required');
            if (!EMAIL_RE.test(email)) throw new ValidationException('Invalid email format');
            const subs = await this.subscriptionService.getSubscriptions(email);
            res.status(200).json(subs);
        } catch (err) {
            next(err);
        }
    }
}
