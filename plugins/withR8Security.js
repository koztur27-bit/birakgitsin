const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RULES_PATH = path.resolve(__dirname, '..', 'proguard-rules.expo.append');
const MARKER = 'Birak Gitsin - R8/security keep rules';

/**
 * R8/minify ve resource shrinking ayarları expo-build-properties plugin'inden gelir.
 * Bu plugin yalnızca proje keep kurallarını prebuild sırasında android/app/proguard-rules.pro
 * dosyasına ekler; böylece CI ve yerel prebuild aynı korumayı üretir.
 */
module.exports = function withR8Security(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const proguardPath = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      let contents = '';
      try {
        contents = fs.readFileSync(proguardPath, 'utf8');
      } catch {}
      if (!contents.includes(MARKER)) {
        const extra = fs.readFileSync(RULES_PATH, 'utf8').trimEnd();
        fs.writeFileSync(proguardPath, contents.trimEnd() + '\n\n' + extra + '\n', 'utf8');
      }
      return cfg;
    },
  ]);
};
