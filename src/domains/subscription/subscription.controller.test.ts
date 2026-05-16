import { createMockSubscriptionService, createValidSubscription } from '@test/mock-utils';
import { SubscriptionController } from './subscription.controller';
import type { Request, Response } from 'express';
import type { SubscribePayload } from './dto/subscribe-payload.dto';
import type { RequestWithTokenParams } from './dto/confirm-subscription-params.dto';
import type { GetSubscriptionsQueryParams } from './dto/get-subscriptions-query-params.dto';
import type { Subscription } from './dto/subscription.dto';

const mockSubscriptionService = createMockSubscriptionService();

let subscriptionController: SubscriptionController;

const validSubscription = createValidSubscription();

const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
} as unknown as Response;

describe('SubscriptionController', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        subscriptionController = new SubscriptionController(mockSubscriptionService);
        (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
    });

    describe('subscribe', () => {
        it('calls appropriate service method and returns correct value', async () => {
            const mockRequest = { body: { email: 'test@example.com', repo: 'owner/repo' } } as Request<
                unknown,
                unknown,
                SubscribePayload
            >;

            mockSubscriptionService.subscribe.mockResolvedValue(undefined);

            await subscriptionController.subscribe(mockRequest, mockResponse);

            expect(mockSubscriptionService.subscribe).toHaveBeenCalledWith(mockRequest.body);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: expect.any(String),
            });
        });
    });

    describe('confirm', () => {
        it('calls appropriate service method and returns correct value', async () => {
            const mockRequest = {
                params: { token: 'confirm_token' },
            } as Request<RequestWithTokenParams>;

            mockSubscriptionService.confirmSubscription.mockResolvedValue(undefined);

            await subscriptionController.confirm(mockRequest, mockResponse);

            expect(mockSubscriptionService.confirmSubscription).toHaveBeenCalledWith(mockRequest.params.token);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: expect.any(String),
            });
        });
    });

    describe('unsubscribe', () => {
        it('calls appropriate service method and returns correct value', async () => {
            const mockRequest = {
                params: { token: 'unsub_token' },
            } as Request<RequestWithTokenParams>;

            mockSubscriptionService.unsubscribe.mockResolvedValue(undefined);

            await subscriptionController.unsubscribe(mockRequest, mockResponse);

            expect(mockSubscriptionService.unsubscribe).toHaveBeenCalledWith(mockRequest.params.token);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: expect.any(String),
            });
        });
    });

    describe('getSubscriptions', () => {
        it('calls appropriate service method and returns correct value', async () => {
            const mockRequest = { query: { email: 'test@example.com' } } as Request<
                unknown,
                unknown,
                unknown,
                GetSubscriptionsQueryParams
            >;
            const mockFoundSubscriptions: Subscription[] = [validSubscription];

            mockSubscriptionService.getSubscriptions.mockResolvedValue(mockFoundSubscriptions);

            await subscriptionController.getSubscriptions(mockRequest, mockResponse);

            expect(mockSubscriptionService.getSubscriptions).toHaveBeenCalledWith(mockRequest.query.email);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockFoundSubscriptions);
        });
    });
});
