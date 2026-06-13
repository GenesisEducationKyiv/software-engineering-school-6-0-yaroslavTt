export interface IGithubRepoService {
    repoExists(owner: string, repo: string): Promise<boolean>;
}
