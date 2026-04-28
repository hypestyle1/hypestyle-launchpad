

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "hypestyle.local" },
      { protocol: "https", hostname: "**.hypestyle.com" },
    ],
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
