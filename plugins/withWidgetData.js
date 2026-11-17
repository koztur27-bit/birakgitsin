const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
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

const withWidgetData = (config) => {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const src = path.join(projectRoot, 'widgetdata', 'native');
      const androidMain = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main');
      copyDir(path.join(src, 'kotlin'), path.join(androidMain, 'java'));
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    const contents = cfg.modResults.contents;
    const patched = contents.replace(
      '          // add(MyReactNativePackage())',
      '          // add(MyReactNativePackage())\n          add(BirakGitsinWidgetDataPackage())'
    );
    cfg.modResults.contents = patched;
    return cfg;
  });

  return config;
};

module.exports = withWidgetData;
