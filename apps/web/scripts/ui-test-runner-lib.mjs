import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const BUILD_DIR = ".ui-test-build";
const UNIT_TEST_DIR = path.join(BUILD_DIR, "tests", "unit");

export const REQUIRE_FLAGS = [
  "--require=./tests/unit/register-test-env.cjs",
  "--require=./tests/unit/register-module-alias.cjs",
  "--require=./tests/unit/register-next-image-stub.cjs",
  "--require=./tests/unit/register-next-navigation-stub.cjs",
];

/** Every compiled *.test.ts under tests/unit, plus the hand-written *.test.cjs files. */
export function testFiles() {
  const compiled = readdirSync(UNIT_TEST_DIR)
    .filter((name) => name.endsWith(".test.js"))
    .sort()
    .map((name) => path.join(UNIT_TEST_DIR, name));

  const handWritten = readdirSync("tests/unit")
    .filter((name) => name.endsWith(".test.cjs"))
    .sort()
    .map((name) => path.join("tests/unit", name));

  return [...compiled, ...handWritten];
}

/** Compiled *.js files under a build directory, recursively, for coverage --include. */
export function compiledJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...compiledJsFiles(full));
    } else if (entry.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

export function coverageIncludes() {
  return [
    path.join(BUILD_DIR, "app", "page.js"),
    path.join(BUILD_DIR, "components", "ConcertModal.js"),
    path.join(BUILD_DIR, "components", "StreamingServiceLinks.js"),
    ...compiledJsFiles(path.join(BUILD_DIR, "lib")),
    ...compiledJsFiles(path.join(BUILD_DIR, "app", "api")),
  ];
}
