/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['imap', 'mailparser']
  }
}
module.exports = nextConfig
