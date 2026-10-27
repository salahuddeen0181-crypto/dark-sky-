import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A production build next to the dev server (public test): NEXT_DIST_DIR=.next-prod next build / next start
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Docker image (see Dockerfile): a self-contained server without the whole node_modules
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Cross-origin isolation for the admin: background removal (ONNX Runtime WASM) can then use several CPU threads.
  // "credentialless" keeps cross-origin fonts and the CDN working; browsers without it just stay single-threaded.
  // Security headers everywhere. The page may be framed only by itself and Telegram (the staff Mini App in
  // Telegram Web), so no other site can put it in an invisible iframe.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org" },
      ],
    }, {
      source: "/admin/:path*",
      headers: [
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ],
    }];
  },
};

export default nextConfig;
