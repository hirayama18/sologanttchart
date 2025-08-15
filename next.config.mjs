/** @type {import('next').NextConfig} */
const nextConfig = {
  // API Routesのビルド時静的解析を無効化
  experimental: {
    serverComponentsExternalPackages: ['exceljs'],
  },
  // Dynamic routesの静的生成を無効化
  trailingSlash: false,
};

export default nextConfig;
