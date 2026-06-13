interface BaseNotificationMessage {
    type: 'confirmation' | 'release';
    to: string;
    owner: string;
    repo: string;
    unsubscribeUrl: string;
}

interface ReleaseNotificationMessage extends BaseNotificationMessage {
    type: 'release';
    tagName: string;
    releaseName: string;
    releaseUrl: string;
}

interface ConfirmationNotificationMessage extends BaseNotificationMessage {
    type: 'confirmation';
    confirmUrl: string;
}

export type NotificationMessage = ReleaseNotificationMessage | ConfirmationNotificationMessage;
