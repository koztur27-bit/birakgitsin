const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withWidgetExported(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    if (app.receiver) {
      app.receiver.forEach((r) => {
        if (r.$ && r.$['android:name'] && r.$['android:name'].includes('BirakGitsin')) {
          r.$['android:exported'] = 'true';
        }
      });
    }
    return cfg;
  });
};
