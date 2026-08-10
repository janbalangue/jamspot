// Monorepo Metro config — see https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so changes in packages/shared are picked up
// without restarting Metro.
config.watchFolders = [workspaceRoot];

// Let Metro resolve modules from both this app's own node_modules (if any)
// and the workspace root's node_modules, where npm workspaces hoists/links
// shared dependencies (including the @jamspot/shared symlink).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
