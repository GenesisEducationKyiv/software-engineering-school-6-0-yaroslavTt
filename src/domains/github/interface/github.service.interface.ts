import type { GithubRelease } from '../dto/github-release.dto';

export interface IGithubService {
    repoExists(owner: string, repo: string): Promise<boolean>;
    getLatestRelease(owner: string, repo: string): Promise<GithubRelease | null>;
}
