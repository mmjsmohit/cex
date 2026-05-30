import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "backpack.exchange",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
