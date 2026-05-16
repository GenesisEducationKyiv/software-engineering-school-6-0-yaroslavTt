import express from 'express';
import morgan from 'morgan';
import path from 'path';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import { createSubscriptionRouter } from '@domains/subscription/subscription.routes';
import { errorHandler } from '@middlewares/error-handler.middleware';
import { register } from '@utilities/metrics/prom';
import type { Express } from 'express';
import type { ISubscriptionService } from '@domains/subscription/interface/subscription.service.interface';

export function createApp(subscriptionService: ISubscriptionService): Express {
    const app = express();

    app.use(express.json());
    app.use(morgan('combined'));
    app.use(express.static(path.join(__dirname, '..', 'public')));

    // Swagger UI
    const swaggerDoc = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

    // Confirmation page
    app.get('/confirm', (_req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'confirm.html'));
    });

    // Unsubscribe page
    app.get('/unsubscribe', (_req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'unsubscribe.html'));
    });

    // Subscriptions page
    app.get('/subscriptions', (_req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'subscriptions.html'));
    });

    // API routes
    app.use('/api', createSubscriptionRouter(subscriptionService));

    // Health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', uptime: process.uptime() });
    });

    // Prometheus metrics
    app.get('/metrics', async (_req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });

    app.use(errorHandler);

    return app;
}
