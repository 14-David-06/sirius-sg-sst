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
};

export default nextConfig;
