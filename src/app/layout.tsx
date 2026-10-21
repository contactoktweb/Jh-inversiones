import { brand } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/config";
import "./globals.css";
import "./betterment-inspired.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${brand.name} — ${brand.slogan}`, template: `%s | ${brand.name}` },
  description: `Conoce ${brand.name}: una experiencia digital para explorar planes, visualizar periodos y llevar el seguimiento de tus solicitudes.`,
  openGraph: { title: brand.name, description: "Una nueva perspectiva para tu próximo paso.", type: "website", locale: "es_CO" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#070E46" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:ital,wght@0,400..700;1,400..700&family=Julius+Sans+One&family=Source+Sans+3:ital,wght@0,300..900;1,300..900&family=Source+Sans+Pro:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
