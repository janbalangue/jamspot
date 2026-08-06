import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

import { REQUIRE_FLAGS, coverageIncludes, testFiles } from "./ui-test-runner-lib.mjs";

const args = [
  ...REQUIRE_FLAGS,
  "--test",
  "--experimental-test-coverage",
  ...coverageIncludes().map((file) => `--test-coverage-include=${file}`),
  "--test-coverage-lines=70",
  "--test-coverage-functions=70",
  "--test-coverage-branches=70",
  ...testFiles(),
];

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  encoding: "utf8",
  env: { ...process.env, TZ: "UTC" },
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
process.stdout.write(output);

mkdirSync("coverage", { recursive: true });
writeFileSync("coverage/ui-unit.txt", output);
writeFileSync(
  "coverage/ui-unit.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Jamspot UI Unit Coverage</title><style>body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:2rem;background:#0b0b10;color:#f4f4f5}pre{white-space:pre-wrap;line-height:1.5;background:#18181b;padding:1.5rem;border-radius:.75rem;overflow:auto}</style></head><body><h1>Jamspot UI Unit Coverage</h1><pre>${output
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</pre></body></html>`,
);

process.exit(result.status ?? 1);
