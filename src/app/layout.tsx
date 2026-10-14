import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "DARKSKY Hookah Lounge — Menu",
  description: "Digital menu of DARKSKY Hookah Lounge: hookah, kitchen, cocktails, tea and bar. Order straight to your table.",
  icons: { icon: "/darksky-logo.jpg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030305",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
