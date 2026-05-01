import { Request, Response, NextFunction } from 'express';
import * as subscriptionService from '../services/subscriptionService.js';

export async function subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await subscriptionService.subscribe(req.body as { email: string; repo: string });
        res.status(200).json({ message: 'Subscription successful. Confirmation email sent.' });
    } catch (err) {
        next(err);
    }
}

export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await subscriptionService.confirmSubscription(req.params.token);
        res.status(200).json({ message: 'Subscription confirmed successfully' });
    } catch (err) {
        next(err);
    }
}

export async function unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await subscriptionService.unsubscribe(req.params.token);
        res.status(200).json({ message: 'Unsubscribed successfully' });
    } catch (err) {
        next(err);
    }
}

export async function getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const email = req.query.email as string;
        const subs = await subscriptionService.getSubscriptions(email);
        res.status(200).json(subs);
    } catch (err) {
        next(err);
    }
}
