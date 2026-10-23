import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A production build next to the dev server (public test): NEXT_DIST_DIR=.next-prod next build / next start
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Cross-origin isolation for the admin: background removal (ONNX Runtime WASM) can then use several CPU threads.
  // "credentialless" keeps cross-origin fonts and the CDN working; browsers without it just stay single-threaded.
  async headers() {
    return [{
      source: "/admin/:path*",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ],
    }];
  },
};

export default nextConfig;
