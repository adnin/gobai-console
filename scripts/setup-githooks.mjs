import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Cross-platform git hooks config (works on Windows/macOS/Linux).
try {
  const hooksPath = 'git-hooks';
  if (!existsSync(join(process.cwd(), hooksPath))) {
    process.exit(0);
  }

  const ver = spawnSync('git', ['--version'], { stdio: 'ignore' });
  if (ver.status !== 0) {
    process.exit(0);
  }

  spawnSync('git', ['config', 'core.hooksPath', hooksPath], {
    stdio: 'ignore',
  });
} catch {
  // Never fail install due to hooks.
}
