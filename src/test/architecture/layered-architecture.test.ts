import fs from 'fs';
import path from 'path';

/**
 * Fitness test for the layer/module boundaries described in
 * docs/system-design/architecture.md#layers--dependency-rules.
 *
 * It parses import specifiers with a regex instead of type-checking, so it stays fast
 * and has no dependency on the rest of the program compiling.
 */

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const APPS = path.join(ROOT, 'apps');
const DOMAINS_DIR = path.join(SRC, 'domains');

// Layers that sit "below" domains: shared building blocks, no business logic of their own.
const FOUNDATION_DIRS = ['config', 'constants', 'common', 'db', 'exceptions', 'middlewares', 'utilities', 'proto'];

// Explicit allowed edges between domains (fromDomain -> toDomain). Anything not listed here
// is a new/unapproved coupling and must fail the test until this map is updated on purpose.
const ALLOWED_DOMAIN_EDGES: Record<string, string[]> = {
    subscription: ['github', 'saga'],
    saga: ['subscription', 'notification'],
    scanner: ['github', 'notification', 'subscription'],
    github: [],
    notification: [],
};

const IMPORT_RE = /(?:from|require\()\s*['"]([^'"]+)['"]/g;

function listTsFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...listTsFiles(full));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
            out.push(full);
        }
    }
    return out;
}

function importsOf(file: string): string[] {
    const content = fs.readFileSync(file, 'utf-8');
    return [...content.matchAll(IMPORT_RE)].map((m) => m[1]);
}

function topLevelDir(file: string): string {
    return path.relative(SRC, file).split(path.sep)[0];
}

function domainOfFile(file: string): string | null {
    const rel = path.relative(DOMAINS_DIR, file);
    if (rel.startsWith('..')) return null;
    return rel.split(path.sep)[0];
}

function domainFromAliasImport(spec: string): { domain: string; deep: boolean } | null {
    const match = /^@domains\/([^/]+)(\/.*)?$/.exec(spec);
    if (!match) return null;
    return { domain: match[1], deep: Boolean(match[2]) };
}

function domainFromRelativeImport(spec: string, fromFile: string): string | null {
    if (!spec.startsWith('.')) return null;
    const resolved = path.resolve(path.dirname(fromFile), spec);
    return domainOfFile(resolved);
}

const allSourceFiles = [...listTsFiles(SRC), ...listTsFiles(APPS)];

describe('layered architecture', () => {
    it('foundation layers (config/constants/common/db/exceptions/middlewares/utilities/proto) do not import domains', () => {
        const violations: string[] = [];

        for (const file of allSourceFiles) {
            const top = topLevelDir(file);
            if (!FOUNDATION_DIRS.includes(top)) continue;

            for (const spec of importsOf(file)) {
                const aliasHit = domainFromAliasImport(spec);
                const relativeHit = domainFromRelativeImport(spec, file);
                if (aliasHit || relativeHit) {
                    violations.push(`${path.relative(ROOT, file)} imports "${spec}"`);
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it('cross-domain imports only go through a domain barrel (@domains/<name>), never its internals', () => {
        const violations: string[] = [];

        for (const file of allSourceFiles) {
            const ownDomain = domainOfFile(file);

            for (const spec of importsOf(file)) {
                const aliasHit = domainFromAliasImport(spec);
                if (aliasHit?.deep) {
                    violations.push(
                        `${path.relative(ROOT, file)} imports "${spec}" (deep import, use the domain barrel instead)`,
                    );
                }

                const relativeDomain = domainFromRelativeImport(spec, file);
                if (relativeDomain && relativeDomain !== ownDomain) {
                    violations.push(
                        `${path.relative(ROOT, file)} imports "${spec}" (relative import reaching into another domain)`,
                    );
                }
            }
        }

        expect(violations).toEqual([]);
    });

    it('domain-to-domain dependencies match the approved dependency graph', () => {
        const violations: string[] = [];

        for (const file of allSourceFiles) {
            const ownDomain = domainOfFile(file);
            if (!ownDomain) continue;

            for (const spec of importsOf(file)) {
                const aliasHit = domainFromAliasImport(spec);
                if (!aliasHit || aliasHit.deep || aliasHit.domain === ownDomain) continue;

                const allowed = ALLOWED_DOMAIN_EDGES[ownDomain] ?? [];
                if (!allowed.includes(aliasHit.domain)) {
                    violations.push(
                        `${path.relative(ROOT, file)}: "${ownDomain}" -> "${aliasHit.domain}" is not in ALLOWED_DOMAIN_EDGES`,
                    );
                }
            }
        }

        expect(violations).toEqual([]);
    });
});
