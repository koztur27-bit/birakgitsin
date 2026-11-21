const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_BLOCK = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
            }
            def releaseStoreFile = System.getenv("RELEASE_KEYSTORE_PATH") ?: keystoreProperties['storeFile']
            def releaseStorePassword = System.getenv("RELEASE_STORE_PASSWORD") ?: keystoreProperties['storePassword']
            def releaseKeyAlias = System.getenv("RELEASE_KEY_ALIAS") ?: keystoreProperties['keyAlias']
            def releaseKeyPassword = System.getenv("RELEASE_KEY_PASSWORD") ?: keystoreProperties['keyPassword']
            if (releaseStoreFile) {
                storeFile file(releaseStoreFile)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }
    }`;

const RELEASE_BUILD_TYPE_GUARD = `        release {
            def isReleaseTask = gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }
            def releaseStoreFile = System.getenv("RELEASE_KEYSTORE_PATH") ?: (rootProject.file("keystore.properties").exists() ? new Properties().with { p -> rootProject.file("keystore.properties").withInputStream { p.load(it) }; p['storeFile'] } : null)
            if (isReleaseTask && !releaseStoreFile) {
                throw new GradleException("Release keystore bulunamadi. RELEASE_KEYSTORE_PATH / keystore.properties ayarlayin.")
            }
            if (releaseStoreFile) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Replace signingConfigs block (debug + release) if present, otherwise inject
    const signingConfigsRegex = /    signingConfigs \{\s*debug \{[\s\S]*?\n    \}/;
    if (signingConfigsRegex.test(contents)) {
      contents = contents.replace(signingConfigsRegex, RELEASE_SIGNING_BLOCK);
    }

    // Replace release buildType signingConfig debug -> release with guard
    const releaseBlockRegex = /        release \{\s*\n\s*\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/;
    if (releaseBlockRegex.test(contents)) {
      contents = contents.replace(releaseBlockRegex, RELEASE_BUILD_TYPE_GUARD);
    } else {
      // fallback: replace any signingConfig signingConfigs.debug inside release block
      contents = contents.replace(
        /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
        '$1signingConfig signingConfigs.release'
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
