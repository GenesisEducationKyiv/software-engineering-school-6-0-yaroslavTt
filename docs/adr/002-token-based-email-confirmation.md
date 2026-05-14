# ADR-002: Token-based email confirmation

**Status:** Accepted

## Context:

When a user submits POST /api/subscribe, anyone could subscribe any email address - including ones they don't own. Without verification, the system could be used to spam arbitrary people with release notification emails. The system needs a way to confirm the subscriber actually owns and controls the email address before sending ongoing notifications

## Decision

On subscribe, generate a random UUID token, store it with the subscription (status: unconfirmed), and send a confirmation email with a link containing that token. The subscription only becomes active after GET /api/confirm/:token is called. A separate UUID token is also issued for unsubscribing, included in every notification email

## Alternatives Considered

| Alternative                              | Why rejected                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| No confirmation (immediate subscription) | Anyone could subscribe arbitrary emails - enables abuse and spam                                      |
| OTP / verification code                  | User must copy a code manually; a clickable link is simpler UX for this use case                      |
| OAuth / third-party identity             | Overkill - requires users to have a connected account; the use case is lightweight email subscription |

## Consequences

**Positive:**

- Prevents abuse; only verified email owners receive notifications; unsubscribe is one-click with no login required

**Negatives:**

- Adds a step before the subscription is active - users who don't click the confirmation link never receive notifications and may not understand why
