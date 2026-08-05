import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Node test-runner helpers: CommonJS is intentional (the .cjs extension is what selects it).
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["tests/unit/register-next-image-stub.cjs"],
    rules: {
      // fill/priority/loader/quality are destructured only to drop them before spreading onto <img>.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Compiled output of tsconfig.ui-tests.json (see package.json "test:ui:build").
    ".ui-test-build/**",
  ]),
]);

export default eslintConfig;
