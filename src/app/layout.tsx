import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pão na Chapa · Clube do Pão Quente",
  description: "Vitrine, pedidos, fornadas e encomendas da Padaria e Doceria Pão na Chapa, em Junqueirópolis.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/pao-icon.svg", apple: "/pao-icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
