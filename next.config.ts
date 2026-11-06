import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.1.234"],
  reactCompiler: true,
  // Temporal: ignorar errores de TypeScript en build debido a bug en Next.js 16.2.4
  // con generación de routes.d.ts cuando hay muchos endpoints
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.airtableusercontent.com",
      },
    ],
    qualities: [75, 85],
  },
  // Metadatos OAuth del conector MCP remoto (RFC 8414 y RFC 9728). El App
  // Router no enruta carpetas que empiezan con punto, así que `.well-known`
  // se reescribe a rutas normales. Los clientes piden tanto la ruta base como
  // la que lleva el recurso detrás (`/.well-known/...//api/mcp`).
  // La pantalla donde se autoriza el conector pide la contraseña: que ningún
  // sitio pueda incrustarla en un iframe y disfrazar el clic de "Autorizar".
  async headers() {
    return [
      {
        source: "/autorizar",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/oauth/metadata/autorizacion",
      },
      {
        source: "/.well-known/oauth-authorization-server/:camino*",
        destination: "/api/oauth/metadata/autorizacion",
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/oauth/metadata/recurso",
      },
      {
        source: "/.well-known/oauth-protected-resource/:camino*",
        destination: "/api/oauth/metadata/recurso",
      },
    ];
  },
};

export default nextConfig;
