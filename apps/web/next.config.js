/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "backpack.exchange",
      },
    ],
  },
};

export default nextConfig;
