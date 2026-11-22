import type { NextConfig } from "next";

// Exportación estática (DECISIONS.md D-02): sin servidor; `npm run build` genera `out/`.
const nextConfig: NextConfig = {
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
