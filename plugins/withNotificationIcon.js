const {
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const { addMetaDataItemToMainApplication, getMainApplicationOrThrow } =
  AndroidConfig.Manifest;

const LARGE_ICON_META = 'expo.modules.notifications.large_notification_icon';
const LARGE_ICON_DRAWABLE = 'ic_notification_large';

async function writePng(src, dest, size, sharp) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (sharp) {
    await sharp(src).resize(size, size).png().toFile(dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

module.exports = function withNotificationIcon(config) {
  // expo-notifications yerel bildirimlerde Android largeIcon olarak bu meta
  // verideki drawable kaynağını kullanır (ExpoNotificationBuilder).
  config = withAndroidManifest(config, (config) => {
    const app = getMainApplicationOrThrow(config.modResults);
    addMetaDataItemToMainApplication(
      app,
      LARGE_ICON_META,
      `@drawable/${LARGE_ICON_DRAWABLE}`,
      'resource',
    );
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
      );
      let sharp = null;
      try {
        sharp = require('sharp');
      } catch {
        sharp = null;
      }

      // --- Küçük beyaz silüet (status bar) ---
      const srcSmall = path.join(projectRoot, 'assets', 'notification-icon.png');
      const densities = {
        'drawable-mdpi': 24,
        'drawable-hdpi': 36,
        'drawable-xhdpi': 48,
        'drawable-xxhdpi': 72,
        'drawable-xxxhdpi': 96,
        drawable: 96,
      };
      if (fs.existsSync(srcSmall)) {
        for (const [folder, sz] of Object.entries(densities)) {
          const dir = path.join(resDir, folder);
          fs.mkdirSync(dir, { recursive: true });
          for (const fn of fs.readdirSync(dir)) {
            const low = fn.toLowerCase();
            if (
              (low.includes('notification') && low.includes('icon')) ||
              low.startsWith('ic_stat')
            ) {
              fs.unlinkSync(path.join(dir, fn));
            }
          }
          await writePng(
            srcSmall,
            path.join(dir, 'notification_icon.png'),
            sz,
            sharp,
          );
          // Notifee tarzı resource adıyla da erişilebilsin (alias).
          await writePng(
            srcSmall,
            path.join(dir, 'ic_notification.png'),
            sz,
            sharp,
          );
        }
      }

      // --- Tam renkli logo (bildirim kartı largeIcon) ---
      // prebuild --clean sonrası android/ klasörü yeniden üretildiği için
      // dosya her derivasyon da buraya kopyalanır.
      const srcLarge = path.join(
        projectRoot,
        'assets',
        'notification-large-icon.png',
      );
      if (fs.existsSync(srcLarge)) {
        await writePng(
          srcLarge,
          path.join(resDir, 'drawable', `${LARGE_ICON_DRAWABLE}.png`),
          192,
          sharp,
        );
        const largeDensities = {
          'drawable-mdpi': 48,
          'drawable-hdpi': 72,
          'drawable-xhdpi': 96,
          'drawable-xxhdpi': 128,
          'drawable-xxxhdpi': 192,
        };
        for (const [folder, sz] of Object.entries(largeDensities)) {
          await writePng(
            srcLarge,
            path.join(resDir, folder, `${LARGE_ICON_DRAWABLE}.png`),
            sz,
            sharp,
          );
        }
      }
      return config;
    },
  ]);
};
