

const nextConfig = {
  async redirects() {
    return [
      { source: '/no-love-only-style',  destination: '/colecciones/no-love-only-style', permanent: true },
      { source: '/no-love-only-style/', destination: '/colecciones/no-love-only-style', permanent: true },
      { source: '/camo-set-drop',       destination: '/colecciones/camo-set-drop',      permanent: true },
      { source: '/camo-set-drop/',      destination: '/colecciones/camo-set-drop',      permanent: true },
      { source: '/race',                destination: '/colecciones/race',               permanent: true },
      { source: '/race/',               destination: '/colecciones/race',               permanent: true },
      { source: '/summer-26',           destination: '/colecciones/summer-26',          permanent: true },
      { source: '/summer-26/',          destination: '/colecciones/summer-26',          permanent: true },
      { source: '/regular-tees',        destination: '/colecciones/regular-tees',       permanent: true },
      { source: '/regular-tees/',       destination: '/colecciones/regular-tees',       permanent: true },
    ];
  },
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
