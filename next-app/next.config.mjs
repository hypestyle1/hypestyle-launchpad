

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "hypestyle.local" },
      { protocol: "https", hostname: "**.hypestyle.com" },
      { protocol: "https", hostname: "lightpink-rook-704850.hostingersite.com" },
    ],
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
