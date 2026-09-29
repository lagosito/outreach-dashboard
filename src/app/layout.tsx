import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOBI | Dashboard de leads",
  description: "Pipeline de contactos, engagement en LinkedIn y directorio",
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600;700&display=swap";

const FAVICON =
  "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2226%22 fill=%22%231B1A24%22/><text x=%2250%22 y=%2274%22 font-size=%2266%22 font-family=%22Arial,sans-serif%22 font-weight=%22700%22 fill=%22white%22 text-anchor=%22middle%22>J</text></svg>";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href={FAVICON} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONT_HREF} rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
