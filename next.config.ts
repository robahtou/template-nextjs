import type { NextConfig }  from 'next';


const nextConfig: NextConfig = {
  cacheComponents : true,
  poweredByHeader : false,
  reactCompiler   : true,
  typedRoutes     : true,
  devIndicators   : {
    position: 'bottom-right'
  },
  experimental    : {
    // rootParams      : true,
    turbopackRustReactCompiler: true
  },
  logging         : {
    fetches         : {
      fullUrl     : true,
      hmrRefreshes: true
    },
    incomingRequests: {
      ignore: [/\/favicon\.ico/]
    }
  },
  typescript      : {
    ignoreBuildErrors: false
  },
  output          : 'standalone'
};


export default nextConfig;
