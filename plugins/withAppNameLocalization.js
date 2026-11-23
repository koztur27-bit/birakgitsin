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

module.exports = function withAppNameLocalization(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const resDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    ensureAppName(path.join(resDir, 'values', 'strings.xml'), 'Let It Go');
    ensureAppName(path.join(resDir, 'values-tr', 'strings.xml'), 'Bırak Gitsin');
    return config;
  }]);
};
