const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: isProduction ? './' : '',
};

export default nextConfig;
