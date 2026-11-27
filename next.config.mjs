/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
    'pg',
    '@prisma/adapter-pg',
    '@aws-sdk/client-s3',
    'whatsapp-web.js',
    'unzipper'
  ],
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ]
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:filename',
        destination: '/api/uploads/:filename'
      }
    ];
  }
};

export default nextConfig;
