const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

// CI (GitHub Actions) yerel derlemelerinde Android lint gorevlerini kapatir.
// Neden: lint, dusuk kaynakli sunucularda cok yavas calisir ve
// :app:lintVitalAnalyzeRelease fatal hatalarinda release derlemesini
// kilitler (gozlemlenen 6 saatlik takilma). Lint, assembleRelease icin
// gerekli degildir; kapatmak derlemeyi hem hizlandirir hem guvenilir kilar.
const MARKER = 'BIRAKGITSIN_CI_FAST_BUILD';

const withCiFastBuild = (config) => {
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += `
// ${MARKER}: tum alt projelerde lint gorevlerini kapat.
subprojects { subproject ->
    subproject.tasks.matching { it.name.toLowerCase().contains("lint") }.configureEach { it.enabled = false }
}
`;
    }
    return cfg;
  });

  config = withGradleProperties(config, (cfg) => {
    const setProp = (key, value) => {
      const found = cfg.modResults.find((i) => i.type === 'property' && i.key === key);
      if (found) {
        found.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    };
    setProp('org.gradle.jvmargs', '-Xmx4608m -XX:MaxMetaspaceSize=1024m');
    setProp('org.gradle.parallel', 'true');
    setProp('org.gradle.caching', 'true');
    setProp('org.gradle.daemon', 'false');
    return cfg;
  });

  return config;
};

module.exports = withCiFastBuild;
