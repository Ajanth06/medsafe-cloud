import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AARYX Market Intelligence",
    short_name: "AARYX",
    description:
      "Marktintelligenz für Energie, Makro und geopolitische Ereignisse.",
    start_url: "/market-intelligence",
    scope: "/",
    display: "standalone",
    background_color: "#0b1520",
    theme_color: "#0b1520",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
