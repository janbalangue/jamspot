// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Expo's own default template: the effect intentionally sets state once
    // to trigger a client-only re-render after hydration on web, which is
    // the standard pattern for this problem, not a bug.
    files: ["src/hooks/use-color-scheme.web.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
