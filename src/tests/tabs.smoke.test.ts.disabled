import { expect, test } from 'vitest';

/**
 * Tabs smoke tests
 *
 * These are intentionally light: they ensure tabs screens import cleanly after
 * UI refactors (gluestack conversions, etc.).
 */

test('tabs layout imports', async () => {
  const mod = await import('../app/(app)/(tabs)/_layout.tsx');
  expect(typeof mod.default).toBe('function');
});

test('tabs home imports', async () => {
  const mod = await import('../app/(app)/(tabs)/index.tsx');
  expect(typeof mod.default).toBe('function');
});

test('tabs profile imports', async () => {
  const mod = await import('../app/(app)/(tabs)/profile.tsx');
  expect(typeof mod.default).toBe('function');
});

test('tabs book imports', async () => {
  const mod = await import('../app/(app)/(tabs)/book.tsx');
  expect(typeof mod.default).toBe('function');
});

test('tabs messages re-export imports', async () => {
  const mod = await import('../app/(app)/(tabs)/messages.tsx');
  expect(mod.default).toBeDefined();
});
