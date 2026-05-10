import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from './subscription.service';

export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) {}

    async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.subscriptionService.subscribe(req.body as { email: string; repo: string });
            res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
        } catch (err) {
            next(err);
        }
    }

    async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.subscriptionService.confirmSubscription(req.params.token);
            res.status(200).json({ message: 'Subscription confirmed successfully' });
        } catch (err) {
            next(err);
        }
    }

    async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await this.subscriptionService.unsubscribe(req.params.token);
            res.status(200).json({ message: 'Unsubscribed successfully' });
        } catch (err) {
            next(err);
        }
    }

    async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = req.query.email as string;
            const subs = await this.subscriptionService.getSubscriptions(email);
            res.status(200).json(subs);
        } catch (err) {
            next(err);
        }
    }
}
