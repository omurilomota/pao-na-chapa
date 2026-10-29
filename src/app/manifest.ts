import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pão na Chapa · Clube do Pão Quente",
    short_name: "Pão na Chapa",
    description: "Cardápio, pedidos próprios, fornadas e encomendas da Padaria e Doceria Pão na Chapa.",
    start_url: "/loja",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fcfaf6",
    theme_color: "#d45e3b",
    categories: ["food", "shopping"],
    icons: [{ src: "/pao-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
