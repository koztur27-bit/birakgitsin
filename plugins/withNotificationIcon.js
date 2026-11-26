const {
  withDangerousMod,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');
const {
  compositeImagesAsync,
  createSquareAsync,
  jimpAsync,
} = require('@expo/image-utils');
const fs = require('fs');
const path = require('path');

const { addMetaDataItemToMainApplication, getMainApplicationOrThrow } =
  AndroidConfig.Manifest;

const LARGE_ICON_META = 'expo.modules.notifications.large_notification_icon';
const LARGE_ICON_DRAWABLE = 'ic_notification_large';
const SMALL_ICON_DRAWABLE = 'ic_notification';
const SMALL_ICON_META_KEYS = [
  'expo.modules.notifications.default_notification_icon',
  'com.google.firebase.messaging.default_notification_icon',
];

// Android/OEM bildirim maskeleri kenarları kırpabildiği için logoyu
// hedef tuvalin içine güvenli alanda yerleştiriyoruz. Kaynak PNG'lerdeki
// mevcut paylar korunur; ek ölçek yalnızca kırpılma riskini azaltır.
// Küçük ikon: kaynak içerik ~%92 olduğundan 0.80 çarpanı nihai ~%74 merkez
// alan bırakır (Android durum çubuğu için önerilen %70-75 bandı).
// Büyük ikon: bildirim kartı largeIcon kare/yuvarlak maskesinde kenar
// kırpılmasın diye biraz daha geniş pay bırakılır.
const LARGE_ICON_SAFE_RATIO = 0.82;
const SMALL_ICON_SAFE_RATIO = 0.80;

async function writePng(src, dest, size, safeRatio = 1) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const inner = Math.max(1, Math.round(size * safeRatio));
  const offset = Math.round((size - inner) / 2);
  const resized = await jimpAsync(
    { input: src, originalInput: src, format: 'image/png' },
    [
      {
        operation: 'resize',
        width: inner,
        height: inner,
        fit: 'contain',
        position: 'center',
      },
    ],
  );

  if (inner === size) {
    fs.writeFileSync(dest, resized);
    return;
  }

  const canvas = await createSquareAsync({ size, color: '#00000000' });
  const safe = await compositeImagesAsync({
    foreground: resized,
    background: canvas,
    x: offset,
    y: offset,
  });
  fs.writeFileSync(dest, safe);
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
    // Expo/FCM, notification_icon.png dosyasını kendi üretir ve bizim safe-area
    // kopyamızın üzerine yazabilir. Manifest'i her zaman alias'a yönlendir.
    SMALL_ICON_META_KEYS.forEach((key) => {
      addMetaDataItemToMainApplication(
        app,
        key,
        `@drawable/${SMALL_ICON_DRAWABLE}`,
        'resource',
      );
    });
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
            SMALL_ICON_SAFE_RATIO,
          );
          // Notifee tarzı resource adıyla da erişilebilsin (alias).
          await writePng(
            srcSmall,
            path.join(dir, 'ic_notification.png'),
            sz,
            SMALL_ICON_SAFE_RATIO,
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
          LARGE_ICON_SAFE_RATIO,
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
            LARGE_ICON_SAFE_RATIO,
          );
        }
      }
      return config;
    },
  ]);
};
