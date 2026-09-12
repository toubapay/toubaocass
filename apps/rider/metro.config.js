// Needed because src/ now pulls in the shared-mobile package (see
// package.json's "shared-mobile": "file:../../packages/shared-mobile"),
// which lives outside this app's own directory and is linked in via a
// node_modules symlink.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Metro needs to watch the shared package's real location (outside
// projectRoot) to pick up its files and rebuild when they change.
config.watchFolders = [path.resolve(repoRoot, 'packages/shared-mobile')];

// Resolve every module — including ones required from inside the shared
// package — against this app's own node_modules only, never the shared
// package's node_modules. Without this, Metro would walk up from the
// shared package's real (symlinked-from) path and could pick up a second,
// separate copy of react/react-native from there — two copies of React
// breaks hooks at runtime ("Invalid hook call") even though everything
// still type-checks and bundles without error.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
