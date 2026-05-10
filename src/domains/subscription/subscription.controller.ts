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
            const subs = await this.subscriptionService.getSubscriptions(req.query.email ?? '');
            res.status(200).json(subs);
        } catch (err) {
            next(err);
        }
    }
}
