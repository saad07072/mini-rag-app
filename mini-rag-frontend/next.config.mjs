/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path((?!_next|static).*)',
        destination: `http://localhost:8002/:path*`,
      },
    ];
  },
};

export default nextConfig;

