import type { Metadata } from "next";

import "./globals.css";
import "@esri/calcite-components/dist/calcite/calcite.css";

export const metadata: Metadata = {
  title: "Active SB",
  description: "Santa Barbara County Bicycling and Walking Data Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
