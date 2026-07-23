import type { IGithubRepoService } from './github-repo.service.interface';
import type { IGithubReleaseService } from './github-release.service.interface';

export interface IGithubService extends IGithubRepoService, IGithubReleaseService {}
