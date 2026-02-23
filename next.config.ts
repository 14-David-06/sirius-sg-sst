import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
