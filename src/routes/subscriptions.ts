import { Router } from 'express';
import { apiKeyAuth } from '../middleware/auth.js';
import * as subscriptionController from '../controllers/subscriptionController.js';

const router = Router();

router.post('/subscribe', apiKeyAuth, subscriptionController.subscribe);
router.get('/confirm/:token', subscriptionController.confirm);
router.get('/unsubscribe/:token', subscriptionController.unsubscribe);
router.get('/subscriptions', subscriptionController.getSubscriptions);

export default router;
