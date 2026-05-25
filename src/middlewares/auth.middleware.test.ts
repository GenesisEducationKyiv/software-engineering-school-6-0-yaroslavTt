jest.mock('@config/environment', () => ({
    environmentConfig: { apiKey: undefined },
}));

import { apiKeyAuth } from './auth.middleware';
import { environmentConfig } from '@config/environment';
import type { Request, Response } from 'express';

const mutableConfig = environmentConfig as { apiKey: string | undefined };

describe('apiKeyAuth', () => {
    const mockEmptyResponse = {} as Response;
    const mockNext = jest.fn();

    beforeEach(() => {
        jest.resetAllMocks();
        mutableConfig.apiKey = undefined;
    });
    it('if api key is not in environment config, does nothing', () => {
        const mockRequest = { headers: {} } as Request;

        const actualResult = apiKeyAuth(mockRequest, mockEmptyResponse, mockNext);

        expect(actualResult).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('if api key is in environment config and the key from request matches, calls next', () => {
        const validApiKey = 'valid-api-key';

        const mockRequest = { headers: { 'x-api-key': validApiKey } } as unknown as Request;

        mutableConfig.apiKey = validApiKey;

        const actualResult = apiKeyAuth(mockRequest, mockEmptyResponse, mockNext);

        expect(actualResult).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('if api key is in environment config but does not match the key from request, returns status 401', () => {
        const mockRequest = { headers: { 'x-api-key': 'invalid-api-key' } } as unknown as Request;
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        } as unknown as Response;

        mutableConfig.apiKey = 'valid-api-key';

        const actualResult = apiKeyAuth(mockRequest, mockResponse, mockNext);

        expect(actualResult).toBeUndefined();
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
});
