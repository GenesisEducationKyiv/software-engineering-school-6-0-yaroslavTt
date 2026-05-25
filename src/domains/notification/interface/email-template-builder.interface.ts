export interface IEmailTemplateBuilder {
    confirmationEmail(params: { owner: string; repo: string; confirmUrl: string; unsubscribeUrl: string }): {
        subject: string;
        html: string;
    };
    releaseEmail(params: {
        owner: string;
        repo: string;
        tagName: string;
        releaseName: string;
        releaseUrl: string;
        unsubscribeUrl: string;
    }): { subject: string; html: string };
}
