import { Router } from 'express';
import { apiKeyAuth } from '@middlewares/auth.middleware.js';
import * as subscriptionController from './subscription.controller.js';

const router = Router();

router.post('/subscribe', apiKeyAuth, subscriptionController.subscribe);
router.get('/confirm/:token', subscriptionController.confirm);
router.get('/unsubscribe/:token', subscriptionController.unsubscribe);
router.get('/subscriptions', subscriptionController.getSubscriptions);

export default router;
