const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable package exports so Metro uses TanStack Query legacy bundle (build/legacy/index.js)
// which avoids ESM relative file import issues in React Native.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './src/global.css' });
