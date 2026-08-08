

const nextConfig = {
  // Proxy same-origin para GraphQL: WPGraphQL solo permite CORS desde
  // hypestyle.com.ar, así que en local (localhost) el fetch directo al dominio
  // de WP se bloquea en el browser. Pasando por este rewrite el pedido sale
  // server-to-server (sin CORS) — ver lib/graphql-client.ts (solo dev, solo
  // client-side; /api/products usa la URL absoluta siempre, no esto).
  async rewrites() {
    return [
      { source: '/api/graphql-proxy', destination: 'https://lightpink-rook-704850.hostingersite.com/graphql' },
    ];
  },
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
