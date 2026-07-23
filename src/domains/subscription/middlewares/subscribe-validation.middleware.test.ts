import { ValidationException } from '@exceptions/validation.exception';
import type { SubscribePayload } from '../dto/subscribe-payload.dto';
import { validateSubscribe } from './subscribe-validation.middleware';
import type { Request, Response } from 'express';

const mockResponse = {} as Response;
const mockNext = jest.fn();

describe('validateSubscribe', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('passes validation for valid input', () => {
        const mockValidRequest = { body: { email: 'test@example.com', repo: 'owner/repo' } } as Request<
            unknown,
            unknown,
            SubscribePayload
        >;

        const actualResult = validateSubscribe(mockValidRequest, mockResponse, mockNext);

        expect(actualResult).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('throws ValidationException for invalid email', () => {
        const mockInvalidEmailRequest = { body: { email: 'test@', repo: 'owner/repo' } } as Request<
            unknown,
            unknown,
            SubscribePayload
        >;

        expect(() => validateSubscribe(mockInvalidEmailRequest, mockResponse, mockNext)).toThrow(ValidationException);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('throws ValidationException for invalid repo', () => {
        const mockInvalidRepoRequest = { body: { email: 'test@example.com', repo: 'invalid-repo' } } as Request<
            unknown,
            unknown,
            SubscribePayload
        >;

        expect(() => validateSubscribe(mockInvalidRepoRequest, mockResponse, mockNext)).toThrow(ValidationException);
        expect(mockNext).not.toHaveBeenCalled();
    });
});
