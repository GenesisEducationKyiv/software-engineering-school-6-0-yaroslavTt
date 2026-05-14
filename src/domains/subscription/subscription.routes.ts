import { Router } from 'express';
import { apiKeyAuth } from '@middlewares/auth.middleware';
import { SubscriptionController } from './subscription.controller';
import type { ISubscriptionService } from './interface/subscription.service.interface';
import { validateSubscribe } from './middlewares/subscribe-validation.middleware';
import { validateGetSubscriptions } from './middlewares/get-subscriptions-validation.middleware';

export function createSubscriptionRouter(subscriptionService: ISubscriptionService): Router {
    const router = Router();
    const subscriptionController = new SubscriptionController(subscriptionService);

    router.post('/subscribe', apiKeyAuth, validateSubscribe, (req, res, next) =>
        subscriptionController.subscribe(req, res, next),
    );
    router.get('/confirm/:token', (req, res, next) => subscriptionController.confirm(req, res, next));
    router.get('/unsubscribe/:token', (req, res, next) => subscriptionController.unsubscribe(req, res, next));
    router.get('/subscriptions', validateGetSubscriptions, (req, res, next) =>
        subscriptionController.getSubscriptions(req, res, next),
    );

    return router;
}
