import { Router } from 'express';
import { apiKeyAuth } from '@middlewares/auth.middleware';
import type { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';

export function createSubscriptionRouter(subscriptionService: SubscriptionService): Router {
    const router = Router();
    const subscriptionController = new SubscriptionController(subscriptionService);

    router.post('/subscribe', apiKeyAuth, (req, res, next) => subscriptionController.subscribe(req, res, next));
    router.get('/confirm/:token', (req, res, next) => subscriptionController.confirm(req, res, next));
    router.get('/unsubscribe/:token', (req, res, next) => subscriptionController.unsubscribe(req, res, next));
    router.get('/subscriptions', (req, res, next) => subscriptionController.getSubscriptions(req, res, next));

    return router;
}
