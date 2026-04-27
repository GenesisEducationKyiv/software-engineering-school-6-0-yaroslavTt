import * as service from '../../src/services/subscriptionService';
import * as github from '../../src/services/githubService';
import * as repository from '../../src/repositories/subscriptionRepository';
import * as notifier from '../../src/services/notifierService';
import { ValidationError, NotFoundError, ConflictError, RateLimitError } from '../../src/errors';

jest.mock('../../src/services/githubService');
jest.mock('../../src/repositories/subscriptionRepository');
jest.mock('../../src/services/notifierService');

const mockRepoExists = github.repoExists as jest.MockedFunction<typeof github.repoExists>;
const mockCreate = repository.create as jest.MockedFunction<typeof repository.create>;
const mockFindConfirmToken = repository.findByConfirmToken as jest.MockedFunction<typeof repository.findByConfirmToken>;
const mockFindUnsubToken = repository.findByUnsubToken as jest.MockedFunction<typeof repository.findByUnsubToken>;
const mockDeleteUnsub = repository.deleteByUnsubToken as jest.MockedFunction<typeof repository.deleteByUnsubToken>;
const mockSendConfirmation = notifier.sendConfirmationEmail as jest.MockedFunction<typeof notifier.sendConfirmationEmail>;

beforeEach(() => jest.clearAllMocks());

describe('subscribe', () => {
  const validParams = { email: 'user@example.com', repo: 'golang/go' };

  it('creates a subscription and sends confirmation email', async () => {
    mockRepoExists.mockResolvedValue(true);
    mockCreate.mockResolvedValue({ id: 'uuid', email: 'user@example.com', owner: 'golang', repo: 'go', confirmed: false, confirm_token: 'ct', unsub_token: 'ut', last_seen_tag: null, created_at: new Date() });
    mockSendConfirmation.mockResolvedValue(undefined);

    await expect(service.subscribe(validParams)).resolves.toBeUndefined();
    expect(mockSendConfirmation).toHaveBeenCalledTimes(1);
  });

  it('throws ValidationError for invalid email', async () => {
    await expect(service.subscribe({ email: 'bad', repo: 'golang/go' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for invalid repo format (no slash)', async () => {
    await expect(service.subscribe({ email: 'u@e.com', repo: 'golang' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for invalid repo format (too many parts)', async () => {
    await expect(service.subscribe({ email: 'u@e.com', repo: 'a/b/c' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFoundError when repo does not exist on GitHub', async () => {
    mockRepoExists.mockResolvedValue(false);
    await expect(service.subscribe(validParams)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when subscription already exists', async () => {
    mockRepoExists.mockResolvedValue(true);
    mockCreate.mockResolvedValue(null);
    await expect(service.subscribe(validParams)).rejects.toBeInstanceOf(ConflictError);
  });

  it('re-throws RateLimitError from GitHub', async () => {
    mockRepoExists.mockRejectedValue(new RateLimitError('rate limit'));
    await expect(service.subscribe(validParams)).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe('confirmSubscription', () => {
  it('confirms subscription for valid token', async () => {
    mockFindConfirmToken.mockResolvedValue({ id: 'uuid', email: 'u@e.com', owner: 'a', repo: 'b', confirmed: false, confirm_token: 'tok', unsub_token: 'ut', last_seen_tag: null, created_at: new Date() });
    (repository.setConfirmed as jest.Mock).mockResolvedValue(undefined);
    await expect(service.confirmSubscription('tok')).resolves.toBeUndefined();
  });

  it('throws NotFoundError for unknown token', async () => {
    mockFindConfirmToken.mockResolvedValue(null);
    await expect(service.confirmSubscription('bad')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('unsubscribe', () => {
  it('deletes subscription for valid token', async () => {
    mockFindUnsubToken.mockResolvedValue({ id: 'uuid', email: 'u@e.com', owner: 'a', repo: 'b', confirmed: true, confirm_token: 'ct', unsub_token: 'ut', last_seen_tag: null, created_at: new Date() });
    mockDeleteUnsub.mockResolvedValue(1);
    await expect(service.unsubscribe('ut')).resolves.toBeUndefined();
  });

  it('throws NotFoundError for unknown token', async () => {
    mockFindUnsubToken.mockResolvedValue(null);
    await expect(service.unsubscribe('bad')).rejects.toBeInstanceOf(NotFoundError);
  });
});
