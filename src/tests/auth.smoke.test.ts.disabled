import { expect, test } from 'vitest';

/**
 * Auth smoke tests
 *
 * Goal: keep login/register pages import-safe during UI refactors.
 */

test('login screen imports', async () => {
  const mod = await import('../app/login.tsx');
  expect(typeof mod.default).toBe('function');
});

test('register screen imports', async () => {
  const mod = await import('../app/register.tsx');
  expect(typeof mod.default).toBe('function');
});
