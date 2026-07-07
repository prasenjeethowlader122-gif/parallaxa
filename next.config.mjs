/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@phosphor-icons/react'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
