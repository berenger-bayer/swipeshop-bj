/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'firebase',
      '@firebase/firestore',
      '@firebase/auth',
      '@firebase/storage',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        child_process: false,
        http2: false,
      }
    }

    config.externals = [
      ...(config.externals || []),
      { '@grpc/grpc-js': 'commonjs @grpc/grpc-js' },
      { '@grpc/proto-loader': 'commonjs @grpc/proto-loader' },
    ]

    return config
  },
}

export default nextConfig