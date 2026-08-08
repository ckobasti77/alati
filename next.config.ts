import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lokalne-only teske biblioteke se NE bundluju u serverless funkcije; ucitavaju se
  // dinamicki tek na dugme (lokalno), pa Vercel build/lambda ostaje cist i mali.
  serverExternalPackages: ["whatsapp-web.js", "puppeteer", "puppeteer-core", "playwright-core"],
};

export default nextConfig;
