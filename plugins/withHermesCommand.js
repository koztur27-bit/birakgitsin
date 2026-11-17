const { withAppBuildGradle } = require('@expo/config-plugins');
const path = require('path');

/**
 * React Native Gradle eklentisi `%OS-BIN%` yerine yalnızca x86_64 Linux'u
 * tanıyor. arm64 Linux'ta derleme yaparken (bu projede olduğu gibi) hazır
 * qemu sarmalayıcısını doğrudan kullan.
 */
module.exports = function withHermesCommand(config) {
  if (process.platform !== 'linux' || process.arch !== 'arm64') {
    return config;
  }

  return withAppBuildGradle(config, (cfg) => {
    const hermesCommand = path
      .join(
        cfg.modRequest.projectRoot,
        'node_modules/hermes-compiler/hermesc/linux64-bin/hermesc',
      )
      .replace(/\\/g, '/');

    cfg.modResults.contents = cfg.modResults.contents.replace(
      /^(\s*)hermesCommand\s*=\s*.*$/m,
      `$1hermesCommand = "${hermesCommand}"`,
    );
    return cfg;
  });
};
