import crypto from 'crypto';
import * as subscriptionRepository from './subscription.repository.js';
import * as githubService from '@domains/github/github.service.js';
import * as notifierService from '@domains/notification/notifier.service.js';
import { environmentConfig } from '@config/environment.js';
import { SubscriptionRow } from './dto/subscription-row.dto.js';
import { ValidationException } from '@exceptions/validation.exception.js';
import { NotFoundException } from '@exceptions/not-found.exception.js';
import { ConflictException } from '@exceptions/conflict.exception.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REPO_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export async function subscribe(params: { email: string; repo: string }): Promise<void> {
    const { email, repo } = params;

    if (!EMAIL_RE.test(email)) {
        throw new ValidationException('Invalid email address');
    }
    if (!REPO_RE.test(repo)) {
        throw new ValidationException('Invalid repo format — expected owner/repo');
    }

    const [owner, repoName] = repo.split('/');

    const exists = await githubService.repoExists(owner, repoName);
    if (!exists) {
        throw new NotFoundException(`Repository ${repo} not found on GitHub`);
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
        throw new ConflictException('This email is already subscribed to that repository');
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
        throw new NotFoundException('Confirmation token not found');
    }
    await subscriptionRepository.setConfirmed(token);
}

export async function unsubscribe(token: string): Promise<void> {
    const sub = await subscriptionRepository.findByUnsubToken(token);
    if (!sub) {
        throw new NotFoundException('Unsubscribe token not found');
    }
    await subscriptionRepository.deleteByUnsubToken(token);
}

export async function getSubscriptions(email: string): Promise<SubscriptionRow[]> {
    if (!EMAIL_RE.test(email)) {
        throw new ValidationException('Invalid email address');
    }
    return subscriptionRepository.findConfirmedByEmail(email);
}
