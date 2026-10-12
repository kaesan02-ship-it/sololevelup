import type { NextConfig } from "next";
const staticExport = process.env.SOLO_STATIC_EXPORT === "1";
const config: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  ...(staticExport
    ? { output: "export", distDir: ".next-pages", trailingSlash: true }
    : {}),
};
export default config;
