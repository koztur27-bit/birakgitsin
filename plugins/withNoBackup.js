const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Sağlık/davranış verileri cihaz dışında yedeklenmesin.
 * Google Play veri güvenliği beyanıyla birebir örtüşür.
 */
module.exports = function withNoBackup(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$ = application.$ || {};
      application.$['android:allowBackup'] = 'false';
      application.$['android:fullBackupContent'] = 'false';
      delete application.$['android:dataExtractionRules'];
    }
    return modConfig;
  });
};
