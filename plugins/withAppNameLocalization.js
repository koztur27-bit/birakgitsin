const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureAppName(stringsPath, value) {
  fs.mkdirSync(path.dirname(stringsPath), { recursive: true });
  let content = fs.existsSync(stringsPath)
    ? fs.readFileSync(stringsPath, 'utf8')
    : '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n';

  if (content.includes('name="app_name"')) {
    content = content.replace(/<string name="app_name"[^>]*>.*?<\/string>/, `<string name="app_name">${value}</string>`);
  } else {
    content = content.replace('</resources>', `  <string name="app_name">${value}</string>\n</resources>`);
  }
  fs.writeFileSync(stringsPath, content);
}

function removeAppName(stringsPath) {
  if (!fs.existsSync(stringsPath)) return;
  let content = fs.readFileSync(stringsPath, 'utf8');
  const updated = content.replace(/\s*<string name="app_name"[^>]*>.*?<\/string>/, '');
  if (updated !== content) fs.writeFileSync(stringsPath, updated);
}

module.exports = function withAppNameLocalization(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const resDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    ensureAppName(path.join(resDir, 'values', 'strings.xml'), 'Let It Go');

    // Expo locales config may generate values-b+tr/strings.xml; avoid duplicate resources.
    const bTr = path.join(resDir, 'values-b+tr', 'strings.xml');
    const tr = path.join(resDir, 'values-tr', 'strings.xml');
    if (fs.existsSync(bTr)) {
      ensureAppName(bTr, 'Bırak Gitsin');
      removeAppName(tr);
    } else {
      ensureAppName(tr, 'Bırak Gitsin');
    }
    return config;
  }]);
};
