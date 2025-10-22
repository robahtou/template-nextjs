import type { NextConfig } from 'next';


const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,

  devIndicators: {
    position: 'bottom-right'
  },

  experimental: {
    cssChunking: 'strict',
    viewTransition: true,
    turbopackFileSystemCacheForDev: true
  },

  poweredByHeader: false,
  reactMaxHeadersLength: 1000,

  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true
    },
    incomingRequests: {
      ignore: [/\favicon\.ico/]
    }
  },

  typescript: {
    ignoreBuildErrors: true
  }
};


export default nextConfig;
