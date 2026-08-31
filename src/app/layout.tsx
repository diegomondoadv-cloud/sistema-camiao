import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "./register-sw";

export const metadata: Metadata = {
  title: "Sistema Transportadora",
  description:
    "Controle financeiro e operacional de transportadora rodoviária.",
  applicationName: "Sistema Transportadora",
  appleWebApp: {
    capable: true,
    title: "Transportadora",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
