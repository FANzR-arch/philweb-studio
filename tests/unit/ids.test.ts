import { describe, expect, it } from 'vitest';
import { assertAvailableProjectId, nextBlogPostId } from '../../lib/studio/project-ops';

describe('blog post ids', () => {
  it('uses the calendar date for the first post of the day', () => {
    expect(nextBlogPostId([], '2026-08-20')).toBe('2026-08-20');
  });

  it('allocates a suffix when the date is already taken', () => {
    expect(nextBlogPostId(['2026-08-20'], '2026-08-20')).toBe('2026-08-20-2');
    expect(nextBlogPostId(['2026-08-20', '2026-08-20-2'], '2026-08-20')).toBe('2026-08-20-3');
  });
});

describe('project ids', () => {
  it('rejects duplicate project ids at creation time', () => {
    expect(() => assertAvailableProjectId('flowcard', ['flowcard', 'typepair'])).toThrow(/已存在/);
  });

  it('rejects illegal project ids', () => {
    expect(() => assertAvailableProjectId('My Project', [])).toThrow(/小写字母/);
  });

  it('accepts a new safe id', () => {
    expect(() => assertAvailableProjectId('my-work', ['flowcard'])).not.toThrow();
  });
});
