import { Cormorant_Garamond, Manrope } from "next/font/google";

export const bodyFont = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-body",
});

export const displayFont = Cormorant_Garamond({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});
