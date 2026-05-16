import { ValidationException } from '@exceptions/validation.exception';
import { validateGetSubscriptions } from './get-subscriptions-validation.middleware';
import type { Request, Response } from 'express';
import type { GetSubscriptionsQueryParams } from '../dto/get-subscriptions-query-params.dto';

const mockResponse = {} as Response;
const mockNext = jest.fn();

describe('validateGetSubscriptions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('passes validation for valid input', () => {
        const mockValidRequest = { query: { email: 'test@example.com' } } as Request<
            unknown,
            unknown,
            unknown,
            GetSubscriptionsQueryParams
        >;

        const actualResult = validateGetSubscriptions(mockValidRequest, mockResponse, mockNext);

        expect(actualResult).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('throws ValidationException for invalid email', () => {
        const mockInvalidEmailRequest = { query: { email: 'test@' } } as Request<
            unknown,
            unknown,
            unknown,
            GetSubscriptionsQueryParams
        >;

        expect(() => validateGetSubscriptions(mockInvalidEmailRequest, mockResponse, mockNext)).toThrow(
            ValidationException,
        );
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('throws ValidationException for missing email', () => {
        const mockInvalidRepoRequest = { query: {} } as Request<unknown, unknown, unknown, GetSubscriptionsQueryParams>;

        expect(() => validateGetSubscriptions(mockInvalidRepoRequest, mockResponse, mockNext)).toThrow(
            ValidationException,
        );
        expect(mockNext).not.toHaveBeenCalled();
    });
});
