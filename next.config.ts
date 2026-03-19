import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    localPatterns: [
      {
        pathname: "/image/**",
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
