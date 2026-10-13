const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Kilit ekranı bildirimini "sessiz" olmaktan çıkarmak için kanala duyulmayan
// bir ses tanımlıyoruz. Bu dosyayı android res/raw klasörüne kopyalar.
const withSilentSound = (config) =>
  withDangerousMod(config, [
    'android',
    async (config) => {
      const rawDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/raw'
      );
      await fs.promises.mkdir(rawDir, { recursive: true });
      const src = path.join(config.modRequest.projectRoot, 'assets', 'silent.wav');
      await fs.promises.copyFile(src, path.join(rawDir, 'silent.wav'));
      return config;
    },
  ]);

module.exports = withSilentSound;
