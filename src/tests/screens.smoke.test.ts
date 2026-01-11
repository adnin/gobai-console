import { expect, test } from 'vitest';

/**
 * Screen smoke tests
 *
 * Goal: catch UI refactors that accidentally introduce:
 * - missing component refs (jsx-no-undef / TS name errors)
 * - invalid imports
 * - module init errors
 *
 * These are intentionally light (no rendering / no network). They ensure
 * the file can be imported and exports a default React component.
 */

test('customer store screen imports', async () => {
  const mod = await import('../app/(app)/customer/store/[id].tsx');
  expect(typeof mod.default).toBe('function');
});

test('customer checkout screen imports', async () => {
  const mod = await import('../app/(app)/customer/checkout.tsx');
  expect(typeof mod.default).toBe('function');
});

test('transport screen imports', async () => {
  const mod = await import('../app/(app)/transport/index.tsx');
  expect(typeof mod.default).toBe('function');
});
