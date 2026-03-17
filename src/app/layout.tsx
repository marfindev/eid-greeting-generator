import type { Metadata } from "next";
import { bodyFont, displayFont } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  description:
    "Generator kartu ucapan Idulfitri dengan template premium, editor teks, dan ekspor PNG instan.",
  title: "Eid Greeting Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
