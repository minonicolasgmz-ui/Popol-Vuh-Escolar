import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd()),
  turbopack: { root: path.resolve(process.cwd()) },
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: [
    '.space.chatglm.site',
    '.space.z.ai',
  ],
};

export default nextConfig;
