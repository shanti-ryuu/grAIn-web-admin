/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'http://192.168.1.2',
    'http://192.168.1.2:3001',
    'http://192.168.1.2:3002',
  ],
};

module.exports = nextConfig;
