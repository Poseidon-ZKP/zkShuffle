/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack5: true,
  webpack: (config) => {
    config.resolve.fallback = {
      os: require.resolve('os-browserify'),
      assert: require.resolve('assert'),
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      buffer: require.resolve('buffer'),
      fs: false,
      readline: false,
      ejs: false,
      constants: false,
      path: false,
    };
    return config;
  },
};

module.exports = nextConfig;
