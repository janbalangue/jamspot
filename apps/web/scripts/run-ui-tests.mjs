import { spawnSync } from "node:child_process";

import { REQUIRE_FLAGS, testFiles } from "./ui-test-runner-lib.mjs";

const args = [...REQUIRE_FLAGS, "--test", ...testFiles()];

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: { ...process.env, TZ: "UTC" },
});

process.exit(result.status ?? 1);
