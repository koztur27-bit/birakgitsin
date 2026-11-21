const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RULES = `
# Expo modules / TaskManager / Notifications - R8 keep rules
-keep class expo.modules.** { *; }
-keepclassmembers class * { @expo.modules.kotlin.modules.Module *; }
-keep class expo.modules.taskManager.** { *; }
-keep class expo.modules.notifications.** { *; }
-keep class expo.modules.kotlin.** { *; }
-dontwarn expo.modules.**
`;

module.exports = function withProguardRules(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const proguardPath = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    let contents = '';
    try { contents = fs.readFileSync(proguardPath, 'utf8'); } catch {}
    if (!contents.includes('expo.modules.taskManager')) {
      fs.writeFileSync(proguardPath, contents.trimEnd() + '\n' + RULES, 'utf8');
    }
    return config;
  }]);
};
