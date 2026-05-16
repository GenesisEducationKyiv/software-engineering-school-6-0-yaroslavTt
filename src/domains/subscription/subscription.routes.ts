import { Router } from 'express';
import { apiKeyAuth } from '@middlewares/auth.middleware';
import { SubscriptionController } from './subscription.controller';
import type { ISubscriptionService } from './interface/subscription.service.interface';
import { validateSubscribe } from './middlewares/subscribe-validation.middleware';
import { validateGetSubscriptions } from './middlewares/get-subscriptions-validation.middleware';

export function createSubscriptionRouter(subscriptionService: ISubscriptionService): Router {
    const router = Router();
    const subscriptionController = new SubscriptionController(subscriptionService);

    router.post('/subscribe', apiKeyAuth, validateSubscribe, (req, res) => subscriptionController.subscribe(req, res));
    router.get('/confirm/:token', (req, res) => subscriptionController.confirm(req, res));
    router.get('/unsubscribe/:token', (req, res) => subscriptionController.unsubscribe(req, res));
    router.get('/subscriptions', validateGetSubscriptions, (req, res) =>
        subscriptionController.getSubscriptions(req, res),
    );

    return router;
}
