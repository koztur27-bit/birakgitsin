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

// Evrensel widget tanimlari: tum launcher'lar (MIUI/HyperOS, OneUI, ColorOS, Pixel)
// APPWIDGET_UPDATE filtresi + DEFAULT kategorisi + exported + provider meta-data ister.
const receivers = [
  { name: '.BirakGitsinWidget1x2', info: '@xml/birakgitsin_widget_1x2', label: 'Bırak Gitsin (1x2)' },
  { name: '.BirakGitsinWidget2x2', info: '@xml/birakgitsin_widget_2x2', label: 'Bırak Gitsin (2x2)' },
  { name: '.BirakGitsinWidget2x3', info: '@xml/birakgitsin_widget_2x3', label: 'Bırak Gitsin (2x3)' },
  { name: '.BirakGitsinWidget4x2', info: '@xml/birakgitsin_widget_4x2', label: 'Bırak Gitsin (4x2)' },
];

function canonicalReceiver(r) {
  return {
    $: {
      'android:name': r.name,
      'android:enabled': 'true',
      'android:exported': 'true',
      'android:label': r.label,
      'android:icon': '@drawable/widget_icon',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': r.info,
        },
      },
    ],
  };
}

const withNativeWidget = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const canonical = receivers.map(canonicalReceiver);
    const names = new Set(receivers.map((r) => r.name));

    // Ayni sinifi isaret eden (noktali/noktasiz) yinelenen kayitlari temizle.
    app.receiver = (app.receiver || []).filter((existing) => {
      const name = existing.$ && existing.$['android:name'];
      if (!name) return true;
      const normalized = name.startsWith('.') ? name : `.${name.split('.').pop()}`;
      return !names.has(normalized);
    });

    app.receiver.push(...canonical);
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
