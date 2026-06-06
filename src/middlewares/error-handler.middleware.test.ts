import { errorHandler } from './error-handler.middleware';
import type { Request, Response, NextFunction } from 'express';
import type { HttpException } from '@exceptions/http.exception';
import { logger } from '@config/logger';

describe('errorHandler', () => {
    const mockRequest = {} as Request;
    const mockNext = jest.fn() as NextFunction;
    const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    } as unknown as Response;

    beforeEach(() => {
        jest.resetAllMocks();
        (mockResponse.status as jest.Mock).mockReturnValue(mockResponse);
    });
    it('responds with error status and message for client errors', () => {
        const err = { status: 404, message: 'Not found' } as HttpException;

        errorHandler(err, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('falls back to 500 and generic message when status and message are missing', () => {
        const err = {} as HttpException;

        errorHandler(err, mockRequest, mockResponse, mockNext);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('calls logger.error for 5xx errors', () => {
        const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
        const err = { status: 500, message: 'Boom' } as HttpException;

        errorHandler(err, mockRequest, mockResponse, mockNext);

        expect(loggerSpy).toHaveBeenCalledWith({ err }, '[error]');
    });

    it('does not call logger.error for 4xx errors', () => {
        const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
        const err = { status: 400, message: 'Bad request' } as HttpException;

        errorHandler(err, mockRequest, mockResponse, mockNext);

        expect(loggerSpy).not.toHaveBeenCalled();
    });
});
