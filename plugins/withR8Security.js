const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PROPERTIES = [
  ['android.enableMinifyInReleaseBuilds', 'true'],
  ['android.enableShrinkResourcesInReleaseBuilds', 'true'],
];

const RULES_PATH = path.resolve(__dirname, '..', 'proguard-rules.expo.append');
const MARKER = 'Birak Gitsin - R8/security keep rules';

function setProperty(props, key, value) {
  const index = props.findIndex((p) => p.type === 'property' && p.key === key);
  if (index >= 0) props[index] = { type: 'property', key, value };
  else props.push({ type: 'property', key, value });
}

module.exports = function withR8Security(config) {
  config = withGradleProperties(config, (cfg) => {
    for (const [key, value] of PROPERTIES) setProperty(cfg.modResults, key, value);
    return cfg;
  });

  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const proguardPath = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      let contents = '';
      try {
        contents = fs.readFileSync(proguardPath, 'utf8');
      } catch {}
      if (!contents.includes(MARKER)) {
        const extra = fs.readFileSync(RULES_PATH, 'utf8').trimEnd();
        fs.writeFileSync(proguardPath, contents.trimEnd() + '\n\n' + extra + '\n', 'utf8');
      }
      return cfg;
    },
  ]);
};
