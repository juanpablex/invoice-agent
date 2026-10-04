const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The claude.ai Artifact build (npm run build:artifact) swaps expo-router for a tiny in-memory router.
if (process.env.ARTIFACT === "1") {
  const original = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "expo-router") return { type: "sourceFile", filePath: path.resolve(__dirname, "src/artifact/router.tsx") };
    return (original ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
