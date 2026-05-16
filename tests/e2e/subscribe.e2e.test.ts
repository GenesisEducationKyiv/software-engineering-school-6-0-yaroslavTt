import { test, expect } from '@playwright/test';

const MAILPIT_API = 'http://localhost:8025/api/v1';
const VALID_REPO = 'golang/go';

test.beforeEach(async ({ request }) => {
    await request.delete(`${MAILPIT_API}/messages`);
});

test('subscribe - success, email received, confirm page shows success', async ({ page, request }) => {
    await page.goto('/');
    await page.fill('#email', 'test@example.com');
    await page.fill('#repo', VALID_REPO);
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/success/);

    await page.waitForTimeout(500);
    const mailRes = await request.get(`${MAILPIT_API}/messages`);
    const mail = await mailRes.json();

    expect(mail.total).toBe(1);
    const msg = mail.messages[0];
    expect(msg.To[0].Address).toBe('test@example.com');
    expect(msg.Subject).toContain('Confirm your subscription');

    const fullMsg = await (await request.get(`${MAILPIT_API}/message/${msg.ID}`)).json();
    const confirmUrl = fullMsg.HTML.match(/http:\/\/[^\s"<]+\/confirm\?token=[^\s"<]+/)?.[0];
    expect(confirmUrl).toBeTruthy();

    await page.goto(confirmUrl);
    await expect(page.locator('#title')).toHaveText('Subscription confirmed!');
});

test('subscribe - invalid email shows error', async ({ page }) => {
    await page.goto('/');
    await page.fill('#email', 'not-an-email');
    await page.fill('#repo', VALID_REPO);
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/error/);
    await expect(page.locator('#message')).toContainText('Invalid email');
});

test('subscribe - invalid repo format shows error', async ({ page }) => {
    await page.goto('/');
    await page.fill('#email', 'test@example.com');
    await page.fill('#repo', 'not-a-valid-repo');
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/error/);
    await expect(page.locator('#message')).toContainText('Invalid repo format');
});

test('subscribe - non-existent repo shows error', async ({ page }) => {
    await page.goto('/');
    await page.fill('#email', 'test@example.com');
    await page.fill('#repo', 'this-owner-does-not-exist-xyz/this-repo-does-not-exist-xyz');
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/error/);
});

test('subscribe - duplicate subscription shows error', async ({ page }) => {
    await page.goto('/');
    await page.fill('#email', 'test2@example.com');
    await page.fill('#repo', VALID_REPO);
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/success/);

    await page.fill('#email', 'test2@example.com');
    await page.fill('#repo', VALID_REPO);
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/error/);
    await expect(page.locator('#message')).toContainText('already subscribed');
});

test('unsubscribe - success, unsubscribe link in confirmation email works', async ({ page, request }) => {
    await page.goto('/');
    await page.fill('#email', 'test3@example.com');
    await page.fill('#repo', VALID_REPO);
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/success/);

    await page.waitForTimeout(500);
    const mailRes = await request.get(`${MAILPIT_API}/messages`);
    const mail = await mailRes.json();

    const fullMsg = await (await request.get(`${MAILPIT_API}/message/${mail.messages[0].ID}`)).json();
    const unsubscribeUrl = fullMsg.HTML.match(/http:\/\/[^\s"<]+\/unsubscribe\?token=[^\s"<]+/)?.[0];
    expect(unsubscribeUrl).toBeTruthy();

    await page.goto(unsubscribeUrl);
    await expect(page.locator('#title')).toHaveText('Unsubscribed!');
});

test('subscriptions page - shows confirmed subscription after confirm flow', async ({ page, request }) => {
    await page.goto('/');
    await page.fill('#email', 'test4@example.com');
    await page.fill('#repo', VALID_REPO);
    await page.click('#submitBtn');
    await expect(page.locator('#message')).toHaveClass(/success/);

    await page.waitForTimeout(500);
    const mailRes = await request.get(`${MAILPIT_API}/messages`);
    const mail = await mailRes.json();

    const fullMsg = await (await request.get(`${MAILPIT_API}/message/${mail.messages[0].ID}`)).json();
    const confirmUrl = fullMsg.HTML.match(/http:\/\/[^\s"<]+\/confirm\?token=[^\s"<]+/)?.[0];
    await page.goto(confirmUrl);
    await expect(page.locator('#title')).toHaveText('Subscription confirmed!');

    await page.goto('/subscriptions');
    await page.fill('#email', 'test4@example.com');
    await page.click('#submitBtn');
    await expect(page.locator('#list')).toContainText(VALID_REPO);
});
