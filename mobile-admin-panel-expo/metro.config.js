// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuração para evitar erro "too many open files" no macOS
config.watchFolders = [__dirname];
config.resolver.sourceExts.push("cjs");

// Reduzir o número de arquivos monitorados
config.watcher = {
  ...config.watcher,
  additionalExts: ["cjs", "mjs"],
  healthCheck: {
    enabled: true,
  },
};

module.exports = config;
