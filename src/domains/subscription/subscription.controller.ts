import type { Request, Response } from 'express';
import type { SubscribePayload } from './dto/subscribe-payload.dto';
import type { RequestWithTokenParams } from './dto/confirm-subscription-params.dto';
import type { GetSubscriptionsQueryParams } from './dto/get-subscriptions-query-params.dto';
import type { ISubscriptionService } from './interface/subscription.service.interface';

export class SubscriptionController {
    constructor(private readonly subscriptionService: ISubscriptionService) {}

    async subscribe(req: Request<unknown, unknown, SubscribePayload>, res: Response): Promise<void> {
        await this.subscriptionService.subscribe(req.body);
        res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
    }

    async confirm(req: Request<RequestWithTokenParams>, res: Response): Promise<void> {
        await this.subscriptionService.confirmSubscription(req.params.token);
        res.status(200).json({ message: 'Subscription confirmed successfully' });
    }

    async unsubscribe(req: Request<RequestWithTokenParams>, res: Response): Promise<void> {
        await this.subscriptionService.unsubscribe(req.params.token);
        res.status(200).json({ message: 'Unsubscribed successfully' });
    }

    async getSubscriptions(
        req: Request<unknown, unknown, unknown, GetSubscriptionsQueryParams>,
        res: Response,
    ): Promise<void> {
        const email = req.query.email!;
        const subs = await this.subscriptionService.getSubscriptions(email);
        res.status(200).json(subs);
    }
}
