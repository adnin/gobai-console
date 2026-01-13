import { expect, test } from 'vitest';

/**
 * Onboarding smoke tests
 *
 * Keep these lightweight: ensure screens import cleanly after UI refactors.
 */

test('onboarding layout imports', async () => {
  const mod = await import('../app/(app)/onboarding/_layout.tsx');
  expect(typeof mod.default).toBe('function');
});

test('onboarding index imports', async () => {
  const mod = await import('../app/(app)/onboarding/index.tsx');
  expect(typeof mod.default).toBe('function');
});

test('onboarding merchant imports', async () => {
  const mod = await import('../app/(app)/onboarding/merchant.tsx');
  expect(typeof mod.default).toBe('function');
});

test('onboarding driver imports', async () => {
  const mod = await import('../app/(app)/onboarding/driver.tsx');
  expect(typeof mod.default).toBe('function');
});
