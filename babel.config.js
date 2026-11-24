module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Sadece production bundle'inda konsol gurultusunu temizle.
  // console.error korunur: kritik hata kayitlari cihazda/error log icin gerekli.
  if (process.env.NODE_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
