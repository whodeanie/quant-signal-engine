/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
