/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path((?!_next|static).*)',
        destination: `http://localhost:8000/:path*`,
      },
    ];
  },
};

export default nextConfig;

