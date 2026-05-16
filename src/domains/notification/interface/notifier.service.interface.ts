export interface INotifierService {
    sendConfirmationEmail(params: {
        to: string;
        owner: string;
        repo: string;
        confirmUrl: string;
        unsubscribeUrl: string;
    }): Promise<void>;

    sendReleaseEmail(params: {
        to: string;
        owner: string;
        repo: string;
        tagName: string;
        releaseName: string;
        releaseUrl: string;
        unsubscribeUrl: string;
    }): Promise<void>;
}
