const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function makeWhiteIcon(size) {
  // simple 1-bit style: draw via raw PNG from a base 96px asset if present
  return null;
}

module.exports = function withNotificationIcon(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const srcIcon = path.join(projectRoot, 'assets', 'notification-icon.png');
    if (!fs.existsSync(srcIcon)) return config;
    const resDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const densities = {
      'drawable-mdpi': 24, 'drawable-hdpi': 36, 'drawable-xhdpi': 48,
      'drawable-xxhdpi': 72, 'drawable-xxxhdpi': 96, 'drawable': 96,
    };
    for (const [folder, sz] of Object.entries(densities)) {
      const dir = path.join(resDir, folder);
      fs.mkdirSync(dir, { recursive: true });
      // remove old notification icons
      for (const fn of fs.readdirSync(dir)) {
        const low = fn.toLowerCase();
        if ((low.includes('notification') && low.includes('icon')) || low.startsWith('ic_stat')) {
          fs.unlinkSync(path.join(dir, fn));
        }
      }
      // write sized icon using jimp-free approach: copy 96 and let Android scale? Better resize with sharp if available, else copy
      const dest = path.join(dir, 'notification_icon.png');
      try {
        // try sharp
        const sharp = require('sharp');
        await sharp(srcIcon).resize(sz, sz).png().toFile(dest);
      } catch {
        fs.copyFileSync(srcIcon, dest);
      }
    }
    return config;
  }]);
};
