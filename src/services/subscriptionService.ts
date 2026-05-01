import crypto from 'crypto';
import * as subscriptionRepository from '../repositories/subscriptionRepository.js';
import * as githubService from './githubService.js';
import * as notifierService from './notifierService.js';
import { ValidationError, NotFoundError, ConflictError } from '../errors.js';
import { environmentConfig } from '../config/environment.js';
import { SubscriptionRow } from '../types/subscription.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export async function subscribe(params: { email: string; repo: string }): Promise<void> {
    const { email, repo } = params;

    if (!EMAIL_RE.test(email)) {
        throw new ValidationError('Invalid email address');
    }
    if (!REPO_RE.test(repo)) {
        throw new ValidationError('Invalid repo format — expected owner/repo');
    }

    const [owner, repoName] = repo.split('/');

    const exists = await githubService.repoExists(owner, repoName);
    if (!exists) {
        throw new NotFoundError(`Repository ${repo} not found on GitHub`);
    }

    const confirmToken = crypto.randomBytes(32).toString('hex');
    const unsubToken = crypto.randomBytes(32).toString('hex');

    const created = await subscriptionRepository.create({
        email,
        owner,
        repo: repoName,
        confirmToken,
        unsubToken,
    });

    if (!created) {
        throw new ConflictError('This email is already subscribed to that repository');
    }

    const confirmUrl = `${environmentConfig.appBaseUrl}/api/confirm/${confirmToken}`;
    await notifierService.sendConfirmationEmail({
        to: email,
        owner,
        repo: repoName,
        confirmUrl,
    });
}

export async function confirmSubscription(token: string): Promise<void> {
    const sub = await subscriptionRepository.findByConfirmToken(token);
    if (!sub) {
        throw new NotFoundError('Confirmation token not found');
    }
    await subscriptionRepository.setConfirmed(token);
}

export async function unsubscribe(token: string): Promise<void> {
    const sub = await subscriptionRepository.findByUnsubToken(token);
    if (!sub) {
        throw new NotFoundError('Unsubscribe token not found');
    }
    await subscriptionRepository.deleteByUnsubToken(token);
}

export async function getSubscriptions(email: string): Promise<SubscriptionRow[]> {
    if (!EMAIL_RE.test(email)) {
        throw new ValidationError('Invalid email address');
    }
    return subscriptionRepository.findConfirmedByEmail(email);
}
