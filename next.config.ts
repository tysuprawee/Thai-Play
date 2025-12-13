import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'esighkzkicttxicyktxm.supabase.co',
      },
    ],
  },
};

export default nextConfig;
