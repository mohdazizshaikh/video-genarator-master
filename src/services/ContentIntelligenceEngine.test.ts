import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentIntelligenceEngine } from './ContentIntelligenceEngine';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) fs.removeSync(dir); });

describe('ContentIntelligenceEngine', () => {
  it('builds a tenant-scoped review-required brief from intelligence signals', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-intel-'));
    dirs.push(dir);
    const brief = await new ContentIntelligenceEngine(dir).buildBrief({
      tenantId: 'tenant-a', category: 'Tech', platform: 'youtube', niche: 'tech', topic: 'Practical AI tools',
    });
    expect(brief.category).toBe('Tech');
    expect(brief.requiresHumanReview).toBe(true);
    expect(brief.rationale.some((item) => item.includes('Human Editorial'))).toBe(true);
    expect(brief.priority).toMatch(/critical|high|medium|normal/);
  }, 15000);
});
