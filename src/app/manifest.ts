import type { MetadataRoute } from "next";

/** Manifesto do PWA — permite instalar o sistema no celular/desktop. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistema Transportadora",
    short_name: "Transportadora",
    description: "Controle financeiro e operacional da frota.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#059669",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
