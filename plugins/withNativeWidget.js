const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const receivers = [
  { name: '.BirakGitsinWidget1x2', info: '@xml/birakgitsin_widget_1x2', label: 'Bırak Gitsin 1x2' },
  { name: '.BirakGitsinWidget2x2', info: '@xml/birakgitsin_widget_2x2', label: 'Bırak Gitsin 2x2' },
  { name: '.BirakGitsinWidget2x3', info: '@xml/birakgitsin_widget_2x3', label: 'Bırak Gitsin 2x3' },
  { name: '.BirakGitsinWidget4x2', info: '@xml/birakgitsin_widget_4x2', label: 'Bırak Gitsin 4x2' },
];

const withNativeWidget = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.receiver = app.receiver || [];
    for (const r of receivers) {
      const exists = app.receiver.some((x) => x.$ && x.$['android:name'] === r.name);
      if (!exists) {
        app.receiver.push({
          $: {
            'android:name': r.name,
            'android:enabled': 'true',
            'android:exported': 'true',
            'android:label': r.label,
            'android:icon': '@mipmap/ic_launcher',
            'android:permission': 'android.permission.BIND_APPWIDGET',
          },
          'intent-filter': [
            { action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] },
            { action: [{ $: { 'android:name': 'com.birakgitsin.app.WIDGET_UPDATE' } }] },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': r.info,
              },
            },
          ],
        });
      }
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const src = path.join(projectRoot, 'widgets', 'native');
      const androidMain = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main');
      copyDir(path.join(src, 'kotlin'), path.join(androidMain, 'java'));
      copyDir(path.join(src, 'res'), path.join(androidMain, 'res'));
      return cfg;
    },
  ]);

  return config;
};

module.exports = withNativeWidget;
