import type { GithubRelease } from '../dto/github-release.dto';

export interface IGithubReleaseService {
    getLatestRelease(owner: string, repo: string): Promise<GithubRelease | null>;
}
