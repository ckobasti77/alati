import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kod Majstora · Alati",
    short_name: "Alati",
    description: "Evidencija narudžbina, proizvoda i obračuna.",
    lang: "sr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nova narudžbina", short_name: "Nova", url: "/narudzbine?nova=1" },
      { name: "Narudžbine", url: "/narudzbine" },
    ],
  };
}
