import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/components/popol-vuh/book/book.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: './fonts/geist-latin.woff2',
  weight: '100 900',
  variable: "--font-geist-sans",
  display: 'swap',
});

const editorial = localFont({
  src: [
    { path: './fonts/source-serif-4-latin.woff2', weight: '200 900', style: 'normal' },
    { path: './fonts/source-serif-4-latin-italic.woff2', weight: '200 900', style: 'italic' },
  ],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Popol Vuh — El Libro del Consejo Maya",
  description: "Aplicación interactiva para que alumnos editen y narren las etapas del Popol Vuh, el libro sagrado maya.",
  keywords: ["Popol Vuh", "Maya", "Libro sagrado", "Educación", "Interactivo"],
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${editorial.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#102B26' };
