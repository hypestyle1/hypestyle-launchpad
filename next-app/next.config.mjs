

// Headers de seguridad, aplicados a todas las rutas.
//
// HSTS ya lo pone Vercel por su cuenta (Strict-Transport-Security: max-age=63072000),
// por eso no está acá.
//
// NO se agrega Content-Security-Policy a propósito: el sitio carga scripts
// inline de GA4, el pixel de Meta, Clarity y el SDK de PayPal, así que una CSP
// hecha a las apuradas rompería la medición o el checkout. Es un proyecto
// aparte, con report-only primero.
const SECURITY_HEADERS = [
  // Clickjacking: nadie puede meter el sitio en un iframe ajeno. SAMEORIGIN y
  // no DENY porque el admin usa un iframe con srcDoc para previsualizar mails.
  // (Los iframes de YouTube y del preview son el sitio embebiendo a OTROS, que
  // este header no afecta.)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Evita que el navegador adivine el tipo de un archivo y termine ejecutando
  // como script algo que se sirvió como texto o imagen.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // No filtrar la URL completa (con query params) al salir hacia otro dominio.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // El sitio no usa ninguna de las tres. Se dejan fuera payment y fullscreen a
  // propósito: payment lo puede pedir el SDK de PayPal y fullscreen lo usa el
  // embed de YouTube de VideoSection.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  // No anunciar el framework ni su versión en cada respuesta.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
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
