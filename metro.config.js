const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

function stripHermesBytecode(url) {
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return url;
  const params = new URLSearchParams(url.slice(qIndex + 1));
  params.delete('transform.engine');
  params.delete('transform.bytecode');
  params.delete('unstable_transformProfile');
  const query = params.toString();
  return query ? `${url.slice(0, qIndex)}?${query}` : url.slice(0, qIndex);
}

const originalRewrite = config.server.rewriteRequestUrl;
config.server.rewriteRequestUrl = (url) => stripHermesBytecode(originalRewrite(url));

module.exports = config;