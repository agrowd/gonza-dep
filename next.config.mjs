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
  ]
};

export default nextConfig;
