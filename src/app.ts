import type { Express } from 'express';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import YAML from 'yamljs';
import swaggerUi from 'swagger-ui-express';
import { createSubscriptionRouter } from '@domains/subscription/subscription.routes';
import { errorHandler } from '@middlewares/error-handler.middleware';
import { register } from '@utilities/metrics/prom';
import type { SubscriptionService } from '@domains/subscription/subscription.service';

export function createApp(subscriptionService: SubscriptionService): Express {
    const app = express();

    app.use(express.json());
    app.use(morgan('combined'));

    // Swagger UI
    const swaggerDoc = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

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
