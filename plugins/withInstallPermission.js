const { withAndroidManifest } = require('@expo/config-plugins');

const INSTALL_PERMISSION = 'android.permission.REQUEST_INSTALL_PACKAGES';

module.exports = function withInstallPermission(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const hasPermission = manifest['uses-permission'].some(
      (entry) => entry && entry.$ && entry.$['android:name'] === INSTALL_PERMISSION
    );
    if (!hasPermission) {
      manifest['uses-permission'].push({ $: { 'android:name': INSTALL_PERMISSION } });
    }

    const application = manifest.application && manifest.application[0];
    if (application && application.$) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }

    return cfg;
  });
};
